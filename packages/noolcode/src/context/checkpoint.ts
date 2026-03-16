import { Database, eq, and, lt, desc } from "@/storage/db"
import { Log } from "@/util/log"
import { SessionID } from "@/session/schema"
import { CheckpointTable, type TaskState, type FileChange } from "./schema.sql"
import { Identifier } from "@/id/id"
import { BusEvent } from "@/bus/bus-event"
import { Bus } from "@/bus"
import z from "zod"

/**
 * 检查点存储 - 管理 Session 状态快照
 *
 * 功能：
 * 1. 在接力前保存当前 Session 状态
 * 2. 支持按需恢复上下文
 * 3. 自动过期清理
 */
export namespace CheckpointStore {
  const log = Log.create({ service: "context.checkpoint" })

  export type CheckpointType = "pre_handoff" | "post_compact" | "manual"

  export interface Checkpoint {
    id: string
    sessionID: SessionID
    type: CheckpointType
    contextSummary: string
    taskState?: TaskState
    fileChanges?: FileChange[]
    embedding?: ArrayBuffer
    timeCreated: number
    timeExpires?: number
  }

  export const Event = {
    Created: BusEvent.define(
      "checkpoint.created",
      z.object({
        checkpointID: z.string(),
        sessionID: SessionID.zod,
        type: z.string(),
      }),
    ),
    Restored: BusEvent.define(
      "checkpoint.restored",
      z.object({
        checkpointID: z.string(),
        sessionID: SessionID.zod,
      }),
    ),
    Deleted: BusEvent.define(
      "checkpoint.deleted",
      z.object({
        checkpointID: z.string(),
        sessionID: SessionID.zod,
      }),
    ),
  }

  /**
   * 保存检查点
   */
  export async function save(input: {
    sessionID: SessionID
    type: CheckpointType
    contextSummary: string
    taskState?: TaskState
    fileChanges?: FileChange[]
    embedding?: Float32Array
    expiresIn?: number // 过期时间（毫秒）
  }): Promise<Checkpoint> {
    const id = Identifier.create("checkpoint")
    const now = Date.now()
    const timeExpires = input.expiresIn ? now + input.expiresIn : undefined

    const checkpoint: Checkpoint = {
      id,
      sessionID: input.sessionID,
      type: input.type,
      contextSummary: input.contextSummary,
      taskState: input.taskState,
      fileChanges: input.fileChanges,
      embedding: input.embedding ? input.embedding.buffer : undefined,
      timeCreated: now,
      timeExpires,
    }

    Database.use((db) => {
      db.insert(CheckpointTable)
        .values({
          id: checkpoint.id,
          session_id: checkpoint.sessionID,
          type: checkpoint.type,
          context_summary: checkpoint.contextSummary,
          task_state: checkpoint.taskState,
          file_changes: checkpoint.fileChanges,
          embedding: checkpoint.embedding,
          time_created: checkpoint.timeCreated,
          time_expires: checkpoint.timeExpires,
        })
        .run()

      Database.effect(() =>
        Bus.publish(Event.Created, {
          checkpointID: checkpoint.id,
          sessionID: checkpoint.sessionID,
          type: checkpoint.type,
        }),
      )
    })

    log.info("Checkpoint saved", { id, sessionID: input.sessionID, type: input.type })
    return checkpoint
  }

  /**
   * 获取检查点
   */
  export async function get(checkpointID: string): Promise<Checkpoint | null> {
    const row = Database.use((db) =>
      db.select().from(CheckpointTable).where(eq(CheckpointTable.id, checkpointID)).get(),
    )

    if (!row) return null

    return {
      id: row.id,
      sessionID: row.session_id,
      type: row.type as CheckpointType,
      contextSummary: row.context_summary,
      taskState: row.task_state ?? undefined,
      fileChanges: row.file_changes ?? undefined,
      embedding: row.embedding ?? undefined,
      timeCreated: row.time_created,
      timeExpires: row.time_expires ?? undefined,
    }
  }

  /**
   * 获取 Session 的最新检查点
   */
  export async function getLatest(input: {
    sessionID: SessionID
    type?: CheckpointType
  }): Promise<Checkpoint | null> {
    const conditions = [eq(CheckpointTable.session_id, input.sessionID)]

    if (input.type) {
      conditions.push(eq(CheckpointTable.type, input.type))
    }

    const row = Database.use((db) =>
      db
        .select()
        .from(CheckpointTable)
        .where(and(...conditions))
        .orderBy(desc(CheckpointTable.time_created))
        .get(),
    )

    if (!row) return null

    return {
      id: row.id,
      sessionID: row.session_id,
      type: row.type as CheckpointType,
      contextSummary: row.context_summary,
      taskState: row.task_state ?? undefined,
      fileChanges: row.file_changes ?? undefined,
      embedding: row.embedding ?? undefined,
      timeCreated: row.time_created,
      timeExpires: row.time_expires ?? undefined,
    }
  }

  /**
   * 列出 Session 的所有检查点
   */
  export async function list(input: {
    sessionID: SessionID
    limit?: number
  }): Promise<Checkpoint[]> {
    const rows = Database.use((db) =>
      db
        .select()
        .from(CheckpointTable)
        .where(eq(CheckpointTable.session_id, input.sessionID))
        .orderBy(desc(CheckpointTable.time_created))
        .limit(input.limit ?? 10)
        .all(),
    )

    return rows.map((row) => ({
      id: row.id,
      sessionID: row.session_id,
      type: row.type as CheckpointType,
      contextSummary: row.context_summary,
      taskState: row.task_state ?? undefined,
      fileChanges: row.file_changes ?? undefined,
      embedding: row.embedding ?? undefined,
      timeCreated: row.time_created,
      timeExpires: row.time_expires ?? undefined,
    }))
  }

  /**
   * 删除检查点
   */
  export async function remove(checkpointID: string): Promise<void> {
    const row = Database.use((db) =>
      db
        .delete(CheckpointTable)
        .where(eq(CheckpointTable.id, checkpointID))
        .returning()
        .get(),
    )

    if (row) {
      Database.effect(() =>
        Bus.publish(Event.Deleted, {
          checkpointID,
          sessionID: row.session_id,
        }),
      )
      log.info("Checkpoint deleted", { checkpointID })
    }
  }

  /**
   * 清理过期检查点
   */
  export async function cleanupExpired(): Promise<number> {
    const now = Date.now()
    const rows = Database.use((db) =>
      db
        .delete(CheckpointTable)
        .where(and(lt(CheckpointTable.time_expires, now)))
        .returning()
        .all(),
    )

    if (rows.length > 0) {
      log.info("Cleaned up expired checkpoints", { count: rows.length })
    }

    return rows.length
  }
}
