import { BusEvent } from "@/bus/bus-event"
import { Bus } from "@/bus"
import { Database, eq, and, desc } from "@/storage/db"
import { Log } from "@/util/log"
import { Session } from "@/session"
import { SessionID } from "@/session/schema"
import { CheckpointStore } from "./checkpoint"
import { RelayChainTable } from "./schema.sql"
import { Identifier } from "@/id/id"
import { Instance } from "@/project/instance"
import z from "zod"

/**
 * Session 接力管理器 - 管理 Session 之间的上下文接力
 *
 * 功能：
 * 1. 在达到最佳推理窗口时创建新 Session
 * 2. 保存接力前的状态检查点
 * 3. 维护接力链关系
 * 4. 支持上下文继承
 */
export namespace SessionRelay {
  const log = Log.create({ service: "context.relay" })

  export type RelayReason = "optimal" | "critical" | "manual"

  export interface RelayChain {
    id: string
    fromSessionID: SessionID
    toSessionID: SessionID
    checkpointID: string
    reason: RelayReason
    tokensAtRelay: number
    timeCreated: number
  }

  export const Event = {
    RelayTriggered: BusEvent.define(
      "session.relay.triggered",
      z.object({
        sourceSessionID: SessionID.zod,
        targetSessionID: SessionID.zod,
        reason: z.enum(["optimal", "critical", "manual"]),
        tokens: z.number(),
      }),
    ),
    RelayCompleted: BusEvent.define(
      "session.relay.completed",
      z.object({
        sourceSessionID: SessionID.zod,
        targetSessionID: SessionID.zod,
        checkpointID: z.string(),
      }),
    ),
    RelayFailed: BusEvent.define(
      "session.relay.failed",
      z.object({
        sourceSessionID: SessionID.zod,
        reason: z.string(),
        error: z.string(),
      }),
    ),
  }

  /**
   * 执行 Session 接力
   */
  export async function relay(input: {
    sessionID: SessionID
    reason: RelayReason
    tokens: number
    contextSummary: string
    taskState?: CheckpointStore.Checkpoint["taskState"]
    fileChanges?: CheckpointStore.Checkpoint["fileChanges"]
  }): Promise<{ newSession: Session.Info; checkpoint: CheckpointStore.Checkpoint }> {
    log.info("Starting session relay", {
      sessionID: input.sessionID,
      reason: input.reason,
      tokens: input.tokens,
    })

    try {
      // 1. 获取当前 Session
      const current = await Session.get(input.sessionID)

      // 2. 保存检查点
      const checkpoint = await CheckpointStore.save({
        sessionID: input.sessionID,
        type: "pre_handoff",
        contextSummary: input.contextSummary,
        taskState: input.taskState,
        fileChanges: input.fileChanges,
      })

      // 3. 创建新 Session（继承父子关系）
      const newSession = await Session.createNext({
        parentID: current.parentID, // 保持同一父级
        title: `${current.title} (续)`,
        directory: current.directory,
        permission: current.permission,
        workspaceID: current.workspaceID,
      }) as Session.Info

      // 4. 建立接力关系
      await linkRelay({
        fromSessionID: input.sessionID,
        toSessionID: newSession.id,
        checkpointID: checkpoint.id,
        reason: input.reason,
        tokensAtRelay: input.tokens,
      })

      // 5. 发布事件
      Bus.publish(Event.RelayCompleted, {
        sourceSessionID: input.sessionID,
        targetSessionID: newSession.id,
        checkpointID: checkpoint.id,
      })

      log.info("Session relay completed", {
        fromSessionID: input.sessionID,
        toSessionID: newSession.id,
        checkpointID: checkpoint.id,
      })

      return { newSession, checkpoint }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      log.error("Session relay failed", { error: errorMessage })

      Bus.publish(Event.RelayFailed, {
        sourceSessionID: input.sessionID,
        reason: input.reason,
        error: errorMessage,
      })

      throw error
    }
  }

  /**
   * 建立接力链关系
   */
  async function linkRelay(input: {
    fromSessionID: SessionID
    toSessionID: SessionID
    checkpointID: string
    reason: RelayReason
    tokensAtRelay: number
  }): Promise<void> {
    const id = Identifier.create("relay_chain")

    Database.use((db) => {
      db.insert(RelayChainTable)
        .values({
          id,
          from_session_id: input.fromSessionID,
          to_session_id: input.toSessionID,
          checkpoint_id: input.checkpointID,
          reason: input.reason,
          tokens_at_relay: input.tokensAtRelay,
          time_created: Date.now(),
        })
        .run()
    })
  }

  /**
   * 获取 Session 的接力历史
   */
  export async function getRelayHistory(sessionID: SessionID): Promise<RelayChain[]> {
    const rows = Database.use((db) =>
      db
        .select()
        .from(RelayChainTable)
        .where(eq(RelayChainTable.from_session_id, sessionID))
        .orderBy(desc(RelayChainTable.time_created))
        .all(),
    )

    return rows.map((row) => ({
      id: row.id,
      fromSessionID: row.from_session_id,
      toSessionID: row.to_session_id,
      checkpointID: row.checkpoint_id,
      reason: row.reason as RelayReason,
      tokensAtRelay: row.tokens_at_relay,
      timeCreated: row.time_created,
    }))
  }

  /**
   * 获取接力链中的上一个 Session
   */
  export async function getPreviousSession(sessionID: SessionID): Promise<SessionID | null> {
    const row = Database.use((db) =>
      db
        .select()
        .from(RelayChainTable)
        .where(eq(RelayChainTable.to_session_id, sessionID))
        .get(),
    )

    return row?.from_session_id ?? null
  }

  /**
   * 获取接力链中的下一个 Session
   */
  export async function getNextSession(sessionID: SessionID): Promise<SessionID | null> {
    const row = Database.use((db) =>
      db
        .select()
        .from(RelayChainTable)
        .where(eq(RelayChainTable.from_session_id, sessionID))
        .get(),
    )

    return row?.to_session_id ?? null
  }

  /**
   * 获取完整的接力链
   */
  export async function getFullRelayChain(sessionID: SessionID): Promise<{
    ancestors: SessionID[]
    descendants: SessionID[]
  }> {
    const ancestors: SessionID[] = []
    const descendants: SessionID[] = []

    // 向上追溯
    let currentID: SessionID | null = sessionID
    while (currentID) {
      const prevID = await getPreviousSession(currentID)
      if (prevID) {
        ancestors.unshift(prevID)
        currentID = prevID
      } else {
        break
      }
    }

    // 向下查找
    currentID = sessionID
    while (currentID) {
      const nextID = await getNextSession(currentID)
      if (nextID) {
        descendants.push(nextID)
        currentID = nextID
      } else {
        break
      }
    }

    return { ancestors, descendants }
  }

  /**
   * 恢复接力点的上下文
   */
  export async function restoreContext(sessionID: SessionID): Promise<CheckpointStore.Checkpoint | null> {
    const prevSessionID = await getPreviousSession(sessionID)
    if (!prevSessionID) return null

    const checkpoint = await CheckpointStore.getLatest({
      sessionID: prevSessionID,
      type: "pre_handoff",
    })

    return checkpoint
  }

  /**
   * 检查是否需要接力
   */
  export async function shouldRelay(input: {
    sessionID: SessionID
    tokens: number
    modelLimit: { context: number; context_optimal?: number }
  }): Promise<{ needed: boolean; reason?: RelayReason }> {
    const { context, context_optimal } = input.modelLimit
    const optimal = context_optimal ?? Math.floor(context * 0.5)
    const critical = Math.floor(context * 0.9)

    if (input.tokens >= critical) {
      return { needed: true, reason: "critical" }
    }

    if (input.tokens >= optimal) {
      return { needed: true, reason: "optimal" }
    }

    return { needed: false }
  }
}
