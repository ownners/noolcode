import { BusEvent } from "@/bus/bus-event"
import { Bus } from "@/bus"
import { Database, eq, and } from "@/storage/db"
import { Log } from "@/util/log"
import { SessionID } from "@/session/schema"
import { AgentMessageTable } from "@/context/schema.sql"
import { Identifier } from "@/id/id"
import z from "zod"

/**
 * AgentProtocol - Agent 之间的通信协议
 *
 * 功能：
 * 1. 定义标准化的消息格式
 * 2. 提供消息验证
 * 3. 实现确认机制
 * 4. 支持消息持久化
 */
export namespace AgentProtocol {
  const log = Log.create({ service: "agent.protocol" })

  // 消息类型 Schema
  export const TaskAssignMessage = z.object({
    type: z.literal("task_assign"),
    id: z.string(),
    timestamp: z.number(),
    from: z.string(),
    to: z.string(),
    payload: z.object({
      task: z.string(),
      context: z.string(),
      requirements: z.array(z.string()),
      constraints: z.array(z.string()),
      deadline: z.number().optional(),
      priority: z.enum(["high", "medium", "low"]),
    }),
  })

  export const ProgressMessage = z.object({
    type: z.literal("progress"),
    id: z.string(),
    timestamp: z.number(),
    from: z.string(),
    to: z.string(),
    payload: z.object({
      percent: z.number().min(0).max(100),
      currentStep: z.string(),
      findings: z.array(z.string()).optional(),
      issues: z.array(z.string()).optional(),
    }),
  })

  export const ResultMessage = z.object({
    type: z.literal("result"),
    id: z.string(),
    timestamp: z.number(),
    from: z.string(),
    to: z.string(),
    payload: z.object({
      success: z.boolean(),
      output: z.string(),
      artifacts: z
        .array(
          z.object({
            type: z.enum(["file", "code", "text"]),
            path: z.string().optional(),
            content: z.string(),
          }),
        )
        .optional(),
      summary: z.string(),
    }),
  })

  export const HandoffMessage = z.object({
    type: z.literal("handoff"),
    id: z.string(),
    timestamp: z.number(),
    from: z.string(),
    to: z.string(),
    payload: z.object({
      checkpointID: z.string(),
      incompleteTasks: z.array(z.string()),
      recommendations: z.string(),
    }),
  })

  // 联合类型
  export const MessageSchema = z.discriminatedUnion("type", [
    TaskAssignMessage,
    ProgressMessage,
    ResultMessage,
    HandoffMessage,
  ])

  export type Message = z.infer<typeof MessageSchema>
  export type MessageStatus = "pending" | "delivered" | "acknowledged" | "failed"

  export const Event = {
    MessageSent: BusEvent.define(
      "agent.message.sent",
      z.object({
        messageID: z.string(),
        from: z.string(),
        to: z.string(),
        type: z.string(),
      }),
    ),
    MessageDelivered: BusEvent.define(
      "agent.message.delivered",
      z.object({
        messageID: z.string(),
        to: z.string(),
      }),
    ),
    MessageAcknowledged: BusEvent.define(
      "agent.message.acknowledged",
      z.object({
        messageID: z.string(),
        to: z.string(),
      }),
    ),
  }

  /**
   * 协议错误
   */
  export class ProtocolError extends Error {
    constructor(
      message: string,
      public readonly details?: unknown,
    ) {
      super(message)
      this.name = "ProtocolError"
    }
  }

  /**
   * 验证消息格式
   */
  export function validate(message: unknown): Message {
    const result = MessageSchema.safeParse(message)
    if (!result.success) {
      throw new ProtocolError("Invalid message format", result.error)
    }
    return result.data
  }

  /**
   * 创建消息 ID
   */
  export function createMessageID(): string {
    return Identifier.create("agent_message")
  }

  /**
   * 发送消息
   */
  export async function send(input: {
    message: Message
    sessionID: SessionID
  }): Promise<{ id: string; status: MessageStatus }> {
    const validated = validate(input.message)
    const id = validated.id
    const now = Date.now()

    Database.use((db) => {
      db.insert(AgentMessageTable)
        .values({
          id,
          session_id: input.sessionID,
          from_session_id: validated.from as SessionID,
          to_session_id: validated.to as SessionID,
          type: validated.type,
          payload: validated.payload,
          status: "pending",
          time_created: now,
          time_delivered: null,
          time_acknowledged: null,
        })
        .run()
    })

    Bus.publish(Event.MessageSent, {
      messageID: id,
      from: validated.from,
      to: validated.to,
      type: validated.type,
    })

    log.info("Message sent", { id, type: validated.type, from: validated.from, to: validated.to })

    return { id, status: "pending" }
  }

  /**
   * 标记消息为已送达
   */
  export async function markDelivered(messageID: string): Promise<void> {
    const now = Date.now()
    const row = Database.use((db) =>
      db
        .update(AgentMessageTable)
        .set({
          status: "delivered",
          time_delivered: now,
        })
        .where(eq(AgentMessageTable.id, messageID))
        .returning()
        .get(),
    )

    if (row) {
      Bus.publish(Event.MessageDelivered, {
        messageID,
        to: row.to_session_id,
      })
      log.info("Message delivered", { messageID })
    }
  }

  /**
   * 确认消息
   */
  export async function acknowledge(messageID: string): Promise<void> {
    const now = Date.now()
    const row = Database.use((db) =>
      db
        .update(AgentMessageTable)
        .set({
          status: "acknowledged",
          time_acknowledged: now,
        })
        .where(eq(AgentMessageTable.id, messageID))
        .returning()
        .get(),
    )

    if (row) {
      Bus.publish(Event.MessageAcknowledged, {
        messageID,
        to: row.to_session_id,
      })
      log.info("Message acknowledged", { messageID })
    }
  }

  /**
   * 标记消息为失败
   */
  export async function markFailed(messageID: string): Promise<void> {
    Database.use((db) => {
      db.update(AgentMessageTable)
        .set({ status: "failed" })
        .where(eq(AgentMessageTable.id, messageID))
        .run()
    })

    log.warn("Message failed", { messageID })
  }

  /**
   * 获取待处理消息
   */
  export async function getPendingMessages(sessionID: SessionID): Promise<Message[]> {
    const rows = Database.use((db) =>
      db
        .select()
        .from(AgentMessageTable)
        .where(
          and(
            eq(AgentMessageTable.to_session_id, sessionID),
            eq(AgentMessageTable.status, "pending"),
          ),
        )
        .all(),
    )

    return rows.map((row) => ({
      id: row.id,
      timestamp: row.time_created,
      from: row.from_session_id,
      to: row.to_session_id,
      type: row.type as Message["type"],
      payload: row.payload as Message["payload"],
    })) as Message[]
  }

  /**
   * 获取消息历史
   */
  export async function getMessageHistory(input: {
    sessionID: SessionID
    limit?: number
  }): Promise<Array<{ message: Message; status: MessageStatus; time: number }>> {
    const rows = Database.use((db) =>
      db
        .select()
        .from(AgentMessageTable)
        .where(
          and(
            eq(AgentMessageTable.session_id, input.sessionID),
          ),
        )
        .orderBy(AgentMessageTable.time_created)
        .limit(input.limit ?? 50)
        .all(),
    )

    return rows.map((row) => ({
      message: {
        id: row.id,
        timestamp: row.time_created,
        from: row.from_session_id,
        to: row.to_session_id,
        type: row.type as Message["type"],
        payload: row.payload as Message["payload"],
      } as Message,
      status: row.status as MessageStatus,
      time: row.time_created,
    }))
  }

  /**
   * 创建任务分配消息
   */
  export function createTaskAssign(input: {
    from: string
    to: string
    task: string
    context: string
    requirements?: string[]
    constraints?: string[]
    deadline?: number
    priority?: "high" | "medium" | "low"
  }): z.infer<typeof TaskAssignMessage> {
    return {
      type: "task_assign",
      id: createMessageID(),
      timestamp: Date.now(),
      from: input.from,
      to: input.to,
      payload: {
        task: input.task,
        context: input.context,
        requirements: input.requirements ?? [],
        constraints: input.constraints ?? [],
        deadline: input.deadline,
        priority: input.priority ?? "medium",
      },
    }
  }

  /**
   * 创建进度消息
   */
  export function createProgress(input: {
    from: string
    to: string
    percent: number
    currentStep: string
    findings?: string[]
    issues?: string[]
  }): z.infer<typeof ProgressMessage> {
    return {
      type: "progress",
      id: createMessageID(),
      timestamp: Date.now(),
      from: input.from,
      to: input.to,
      payload: {
        percent: input.percent,
        currentStep: input.currentStep,
        findings: input.findings,
        issues: input.issues,
      },
    }
  }

  /**
   * 创建结果消息
   */
  export function createResult(input: {
    from: string
    to: string
    success: boolean
    output: string
    summary: string
    artifacts?: Array<{ type: "file" | "code" | "text"; path?: string; content: string }>
  }): z.infer<typeof ResultMessage> {
    return {
      type: "result",
      id: createMessageID(),
      timestamp: Date.now(),
      from: input.from,
      to: input.to,
      payload: {
        success: input.success,
        output: input.output,
        summary: input.summary,
        artifacts: input.artifacts,
      },
    }
  }

  /**
   * 创建交接消息
   */
  export function createHandoff(input: {
    from: string
    to: string
    checkpointID: string
    incompleteTasks: string[]
    recommendations: string
  }): z.infer<typeof HandoffMessage> {
    return {
      type: "handoff",
      id: createMessageID(),
      timestamp: Date.now(),
      from: input.from,
      to: input.to,
      payload: {
        checkpointID: input.checkpointID,
        incompleteTasks: input.incompleteTasks,
        recommendations: input.recommendations,
      },
    }
  }
}
