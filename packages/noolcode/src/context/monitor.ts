import { BusEvent } from "@/bus/bus-event"
import { Bus } from "@/bus"
import { Config } from "@/config/config"
import { Log } from "@/util/log"
import { SessionID } from "@/session/schema"
import z from "zod"

/**
 * 上下文监控器 - 监控 Token 使用情况并判断是否需要触发接力
 *
 * 设计目标：
 * 1. 支持配置模型的最佳推理窗口 (context_optimal)
 * 2. 提供多级别预警机制
 * 3. 与现有 compaction 流程集成
 */
export namespace ContextMonitor {
  const log = Log.create({ service: "context.monitor" })

  // 触发级别
  export type Level = "normal" | "warning" | "optimal" | "critical"

  export interface TokenInfo {
    total: number
    input: number
    output: number
    reasoning: number
    cache: {
      read: number
      write: number
    }
  }

  export interface ModelLimit {
    context: number
    context_optimal?: number
    context_warning?: number
    input?: number
    output: number
  }

  export interface Status {
    level: Level
    currentTokens: number
    maxContext: number
    optimalContext: number
    warningContext: number
    percentUsed: number
    shouldRelay: boolean
  }

  export const Event = {
    LevelChanged: BusEvent.define(
      "context.level.changed",
      z.object({
        sessionID: SessionID.zod,
        previousLevel: z.enum(["normal", "warning", "optimal", "critical"]),
        currentLevel: z.enum(["normal", "warning", "optimal", "critical"]),
        status: z.object({
          currentTokens: z.number(),
          maxContext: z.number(),
          optimalContext: z.number(),
          warningContext: z.number(),
          percentUsed: z.number(),
          shouldRelay: z.boolean(),
        }),
      }),
    ),
    RelayTriggered: BusEvent.define(
      "context.relay.triggered",
      z.object({
        sessionID: SessionID.zod,
        level: z.enum(["optimal", "critical"]),
        currentTokens: z.number(),
        optimalContext: z.number(),
      }),
    ),
  }

  /**
   * 检查当前上下文状态
   */
  export async function check(input: {
    tokens: TokenInfo
    model: { limit: ModelLimit }
  }): Promise<Status> {
    const config = await Config.get()

    // 获取配置值，使用默认值作为后备
    const context = input.model.limit.context
    const optimal = input.model.limit.context_optimal ?? Math.floor(context * 0.5)
    const warning = input.model.limit.context_warning ?? Math.floor(optimal * 0.75)

    // 计算当前 token 总数
    const count =
      input.tokens.total ??
      input.tokens.input +
        input.tokens.output +
        input.tokens.cache.read +
        input.tokens.cache.write +
        input.tokens.reasoning

    const percentUsed = context > 0 ? (count / context) * 100 : 0

    let level: Level = "normal"
    let shouldRelay = false

    // 判断级别
    if (count >= context * 0.9) {
      level = "critical"
      shouldRelay = true
    } else if (count >= optimal) {
      level = "optimal"
      // 只有在启用了 relay 的情况下才触发
      if (config.compaction?.relay_enabled) {
        shouldRelay = true
      }
    } else if (count >= warning) {
      level = "warning"
    }

    return {
      level,
      currentTokens: count,
      maxContext: context,
      optimalContext: optimal,
      warningContext: warning,
      percentUsed,
      shouldRelay,
    }
  }

  /**
   * 根据策略判断是否应该触发接力
   */
  export async function shouldRelay(input: {
    status: Status
    strategy?: "optimal" | "warning" | "critical"
  }): Promise<boolean> {
    const config = await Config.get()

    // 如果未启用 relay，则不触发
    if (!config.compaction?.relay_enabled) {
      return false
    }

    const strategy = input.strategy ?? config.compaction?.relay_strategy ?? "optimal"

    switch (strategy) {
      case "warning":
        return ["warning", "optimal", "critical"].includes(input.status.level)
      case "optimal":
        return ["optimal", "critical"].includes(input.status.level)
      case "critical":
        return input.status.level === "critical"
      default:
        return false
    }
  }

  /**
   * 格式化状态为可读字符串
   */
  export function formatStatus(status: Status): string {
    const levelEmoji = {
      normal: "🟢",
      warning: "🟡",
      optimal: "🟠",
      critical: "🔴",
    }

    return [
      `${levelEmoji[status.level]} 上下文状态: ${status.level}`,
      `Token 使用: ${status.currentTokens.toLocaleString()} / ${status.maxContext.toLocaleString()} (${status.percentUsed.toFixed(1)}%)`,
      `最佳窗口: ${status.optimalContext.toLocaleString()}`,
      `预警阈值: ${status.warningContext.toLocaleString()}`,
      status.shouldRelay ? "⚠️ 建议进行 Session 接力" : "",
    ]
      .filter(Boolean)
      .join("\n")
  }

  /**
   * 计算距离下一个级别的剩余 token
   */
  export function getRemainingTokens(status: Status): {
    toWarning: number
    toOptimal: number
    toCritical: number
  } {
    return {
      toWarning: Math.max(0, status.warningContext - status.currentTokens),
      toOptimal: Math.max(0, status.optimalContext - status.currentTokens),
      toCritical: Math.max(0, Math.floor(status.maxContext * 0.9) - status.currentTokens),
    }
  }
}
