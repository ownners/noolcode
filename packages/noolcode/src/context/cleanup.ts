import { Database, and, eq, lt } from "@/storage/db"
import { Log } from "@/util/log"
import { CheckpointTable, RelayChainTable, AgentMessageTable } from "./schema.sql"
import { SemanticVectorTable } from "@/semantic/schema.sql"
import { BusEvent } from "@/bus/bus-event"
import { Bus } from "@/bus"
import z from "zod"

/**
 * 上下文清理策略 - 定期清理过期的上下文数据
 *
 * 功能：
 * 1. 清理过期的检查点
 * 2. 清理过期的语义向量
 * 3. 清理已完成的 Agent 消息
 * 4. 清理孤立的接力链
 */
export namespace ContextCleanup {
  const log = Log.create({ service: "context.cleanup" })

  // 默认保留天数
  const DEFAULT_RETENTION_DAYS = 30
  const RETENTION_MS = DEFAULT_RETENTION_DAYS * 24 * 60 * 60 * 1000

  export interface CleanupResult {
    checkpointsDeleted: number
    vectorsDeleted: number
    messagesDeleted: number
    relayChainsDeleted: number
    totalFreed: number
  }

  export const Event = {
    CleanupStarted: BusEvent.define(
      "context.cleanup.started",
      z.object({
        cutoff: z.number(),
      }),
    ),
    CleanupCompleted: BusEvent.define(
      "context.cleanup.completed",
      z.object({
        result: z.object({
          checkpointsDeleted: z.number(),
          vectorsDeleted: z.number(),
          messagesDeleted: z.number(),
          relayChainsDeleted: z.number(),
          totalFreed: z.number(),
        }),
      }),
    ),
    CleanupError: BusEvent.define(
      "context.cleanup.error",
      z.object({
        phase: z.string(),
        error: z.string(),
      }),
    ),
  }

  /**
   * 执行清理
   */
  export async function run(input?: {
    retentionDays?: number
    dryRun?: boolean
  }): Promise<CleanupResult> {
    const retentionMs = (input?.retentionDays ?? DEFAULT_RETENTION_DAYS) * 24 * 60 * 60 * 1000
    const cutoff = Date.now() - retentionMs
    const dryRun = input?.dryRun ?? false

    log.info("Starting context cleanup", { cutoff, retentionDays: input?.retentionDays ?? DEFAULT_RETENTION_DAYS, dryRun })

    Bus.publish(Event.CleanupStarted, { cutoff })

    const result: CleanupResult = {
      checkpointsDeleted: 0,
      vectorsDeleted: 0,
      messagesDeleted: 0,
      relayChainsDeleted: 0,
      totalFreed: 0,
    }

    try {
      // 1. 清理过期的检查点
      result.checkpointsDeleted = await cleanupCheckpoints(cutoff, dryRun)
      log.info("Checkpoints cleaned", { count: result.checkpointsDeleted })

      // 2. 清理过期的语义向量
      result.vectorsDeleted = await cleanupVectors(cutoff, dryRun)
      log.info("Vectors cleaned", { count: result.vectorsDeleted })

      // 3. 清理已完成的 Agent 消息
      result.messagesDeleted = await cleanupMessages(cutoff, dryRun)
      log.info("Messages cleaned", { count: result.messagesDeleted })

      // 4. 清理孤立的接力链
      result.relayChainsDeleted = await cleanupOrphanedRelayChains(dryRun)
      log.info("Relay chains cleaned", { count: result.relayChainsDeleted })

      result.totalFreed =
        result.checkpointsDeleted +
        result.vectorsDeleted +
        result.messagesDeleted +
        result.relayChainsDeleted

      Bus.publish(Event.CleanupCompleted, { result })

      log.info("Context cleanup completed", {
        totalFreed: result.totalFreed,
        breakdown: {
          checkpoints: result.checkpointsDeleted,
          vectors: result.vectorsDeleted,
          messages: result.messagesDeleted,
          relayChains: result.relayChainsDeleted,
        },
      })

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      log.error("Context cleanup failed", { error: errorMessage })

      Bus.publish(Event.CleanupError, {
        phase: "unknown",
        error: errorMessage,
      })

      throw error
    }
  }

  /**
   * 清理过期的检查点
   */
  async function cleanupCheckpoints(cutoff: number, dryRun: boolean): Promise<number> {
    if (dryRun) {
      const rows = Database.use((db) =>
        db
          .select()
          .from(CheckpointTable)
          .where(lt(CheckpointTable.time_created, cutoff))
          .all(),
      )
      return rows.length
    }

    const rows = Database.use((db) =>
      db
        .delete(CheckpointTable)
        .where(lt(CheckpointTable.time_created, cutoff))
        .returning()
        .all(),
    )

    return rows.length
  }

  /**
   * 清理过期的语义向量
   */
  async function cleanupVectors(cutoff: number, dryRun: boolean): Promise<number> {
    if (dryRun) {
      const rows = Database.use((db) =>
        db
          .select()
          .from(SemanticVectorTable)
          .where(lt(SemanticVectorTable.time_created, cutoff))
          .all(),
      )
      return rows.length
    }

    const rows = Database.use((db) =>
      db
        .delete(SemanticVectorTable)
        .where(lt(SemanticVectorTable.time_created, cutoff))
        .returning()
        .all(),
    )

    return rows.length
  }

  /**
   * 清理已完成的 Agent 消息
   */
  async function cleanupMessages(cutoff: number, dryRun: boolean): Promise<number> {
    if (dryRun) {
      const rows = Database.use((db) =>
        db
          .select()
          .from(AgentMessageTable)
          .where(
            and(
              eq(AgentMessageTable.status, "acknowledged"),
              lt(AgentMessageTable.time_created, cutoff),
            ),
          )
          .all(),
      )
      return rows.length
    }

    const rows = Database.use((db) =>
      db
        .delete(AgentMessageTable)
        .where(
          and(
            eq(AgentMessageTable.status, "acknowledged"),
            lt(AgentMessageTable.time_created, cutoff),
          ),
        )
        .returning()
        .all(),
    )

    return rows.length
  }

  /**
   * 清理孤立的接力链（源或目标 Session 已被删除）
   */
  async function cleanupOrphanedRelayChains(dryRun: boolean): Promise<number> {
    // 使用子查询找出孤立的接力链
    // 这里简化实现，实际应该检查 session 表是否存在
    const rows = Database.use((db) => {
      // 查找所有接力链
      const allChains = db.select().from(RelayChainTable).all()

      // 这里应该检查 session 是否存在
      // 简化实现：暂时返回 0
      return []
    })

    return rows.length
  }

  /**
   * 获取清理预览（不实际删除）
   */
  export async function preview(input?: {
    retentionDays?: number
  }): Promise<CleanupResult> {
    return run({ ...input, dryRun: true })
  }

  /**
   * 注册定时清理任务
   * 注意：实际实现应该使用系统的定时任务机制
   */
  export function registerScheduledCleanup(input?: {
    intervalHours?: number
    retentionDays?: number
  }): void {
    const intervalMs = (input?.intervalHours ?? 24) * 60 * 60 * 1000
    const retentionDays = input?.retentionDays ?? DEFAULT_RETENTION_DAYS

    // 注册定时任务
    // 注意：这里需要根据实际的调度系统进行实现
    log.info("Scheduled cleanup registered", {
      intervalHours: input?.intervalHours ?? 24,
      retentionDays,
    })

    // 使用 setInterval 进行简单的定时清理
    const interval = setInterval(
      async () => {
        try {
          await run({ retentionDays })
        } catch (error) {
          log.error("Scheduled cleanup failed", {
            error: error instanceof Error ? error.message : String(error),
          })
        }
      },
      intervalMs,
    )

    // 允许进程退出时自动清理
    interval.unref()
  }
}
