import { BusEvent } from "@/bus/bus-event"
import { Bus } from "@/bus"
import { Log } from "@/util/log"
import { Session } from "@/session"
import { SessionID } from "@/session/schema"
import { Identifier } from "@/id/id"
import z from "zod"

/**
 * Agent Manager 状态机 - 管理 Agent 任务分配和 Subagent 编排
 *
 * 功能：
 * 1. 分析任务复杂度
 * 2. 分解复杂任务为子任务
 * 3. 管理 Subagent 生命周期
 * 4. 协调多个 Subagent 的执行
 */
export namespace AgentManager {
  const log = Log.create({ service: "agent.manager" })

  // 状态定义
  export type StateType = "idle" | "analyzing" | "executing" | "handoff_preparing" | "completed" | "error"

  export interface State {
    type: StateType
    task?: string
    subagents?: Map<string, SubagentInfo>
    error?: Error
  }

  export interface SubagentInfo {
    id: string
    sessionID: SessionID
    type: string // agent type: 'explore', 'general', etc.
    task: string
    status: "pending" | "running" | "completed" | "failed"
    progress: number
    result?: string
  }

  export type TaskComplexity = "simple" | "moderate" | "complex"

  export interface Subtask {
    id: string
    description: string
    task: string
    agentType: string
    dependencies: string[]
    priority: "high" | "medium" | "low"
  }

  export interface ExecutionPlan {
    mode: "direct" | "distributed"
    task?: string
    subtasks?: Subtask[]
  }

  export const Event = {
    StateChanged: BusEvent.define(
      "agent.manager.state_changed",
      z.object({
        previousState: z.string(),
        currentState: z.string(),
        task: z.string().optional(),
      }),
    ),
    SubagentCreated: BusEvent.define(
      "agent.manager.subagent_created",
      z.object({
        subagentID: z.string(),
        sessionID: SessionID.zod,
        type: z.string(),
        task: z.string(),
      }),
    ),
    SubagentCompleted: BusEvent.define(
      "agent.manager.subagent_completed",
      z.object({
        subagentID: z.string(),
        sessionID: SessionID.zod,
        success: z.boolean(),
        result: z.string().optional(),
      }),
    ),
    PlanCreated: BusEvent.define(
      "agent.manager.plan_created",
      z.object({
        mode: z.enum(["direct", "distributed"]),
        taskCount: z.number(),
      }),
    ),
  }

  /**
   * Agent Manager 实例
   */
  export class Manager {
    private state: State = { type: "idle" }
    private subagents: Map<string, SubagentInfo> = new Map()
    private currentSessionID: SessionID

    constructor(sessionID: SessionID) {
      this.currentSessionID = sessionID
    }

    /**
     * 获取当前状态
     */
    getState(): State {
      return { ...this.state }
    }

    /**
     * 分析任务复杂度
     */
    async analyze(task: string): Promise<ExecutionPlan> {
      this.transition("analyzing", task)

      const complexity = await this.assessComplexity(task)
      log.info("Task complexity assessed", { task: task.slice(0, 100), complexity })

      if (complexity === "simple") {
        Bus.publish(Event.PlanCreated, { mode: "direct", taskCount: 1 })
        return { mode: "direct", task }
      }

      // 复杂任务分解
      const subtasks = await this.decompose(task, complexity)
      Bus.publish(Event.PlanCreated, { mode: "distributed", taskCount: subtasks.length })

      return { mode: "distributed", subtasks }
    }

    /**
     * 评估任务复杂度
     */
    private async assessComplexity(task: string): Promise<TaskComplexity> {
      // 简单启发式规则评估复杂度
      const indicators = {
        multiFile: /多文件|多个文件|批量|所有文件|全部文件/i.test(task),
        multiStep: /然后|接着|之后|最后|第一步|第二步|首先/i.test(task),
        architecture: /架构|设计|重构|迁移|系统/i.test(task),
        integration: /集成|连接|对接|API|接口/i.test(task),
        complexLogic: /算法|优化|性能|安全/i.test(task),
      }

      const score = Object.values(indicators).filter(Boolean).length

      if (score >= 3) return "complex"
      if (score >= 1) return "moderate"
      return "simple"
    }

    /**
     * 分解复杂任务
     */
    private async decompose(task: string, complexity: TaskComplexity): Promise<Subtask[]> {
      const subtasks: Subtask[] = []

      // 根据任务特征选择合适的分解策略
      if (/探索|分析|查找|搜索|理解/i.test(task)) {
        subtasks.push({
          id: Identifier.create("subtask"),
          description: "探索代码库",
          task: task,
          agentType: "explore",
          dependencies: [],
          priority: "high",
        })
      }

      if (/实现|编写|创建|开发|添加/i.test(task)) {
        subtasks.push({
          id: Identifier.create("subtask"),
          description: "实现功能",
          task: task,
          agentType: "general",
          dependencies: subtasks.length > 0 ? [subtasks[0].id] : [],
          priority: "high",
        })
      }

      if (/测试|验证|检查/i.test(task)) {
        subtasks.push({
          id: Identifier.create("subtask"),
          description: "编写测试",
          task: `为以下任务编写测试: ${task}`,
          agentType: "general",
          dependencies: subtasks.length > 0 ? [subtasks[subtasks.length - 1].id] : [],
          priority: "medium",
        })
      }

      // 如果没有匹配到任何模式，创建通用任务
      if (subtasks.length === 0) {
        subtasks.push({
          id: Identifier.create("subtask"),
          description: "执行任务",
          task: task,
          agentType: "general",
          dependencies: [],
          priority: "high",
        })
      }

      return subtasks
    }

    /**
     * 执行计划
     */
    async execute(plan: ExecutionPlan): Promise<void> {
      if (plan.mode === "direct") {
        // 直接执行 - 不需要 Subagent
        this.transition("executing", plan.task)
        log.info("Executing task directly", { task: plan.task?.slice(0, 100) })
        this.transition("completed")
        return
      }

      // 分配给 Subagent
      this.transition("executing")
      this.state = { type: "executing", subagents: this.subagents }

      await this.distribute(plan.subtasks!)
    }

    /**
     * 分配任务给 Subagent
     */
    private async distribute(subtasks: Subtask[]): Promise<void> {
      for (const subtask of subtasks) {
        // 检查依赖是否完成
        const dependenciesMet = subtask.dependencies.every((depId) => {
          const dep = this.subagents.get(depId)
          return dep && dep.status === "completed"
        })

        if (!dependenciesMet) {
          log.warn("Dependencies not met for subtask", { subtaskID: subtask.id })
          continue
        }

        const subagentID = Identifier.create("subagent")
        const session = await Session.createNext({
          parentID: this.currentSessionID,
          title: subtask.description,
          directory: (await Session.get(this.currentSessionID)).directory,
        })

        const info: SubagentInfo = {
          id: subagentID,
          sessionID: session.id,
          type: subtask.agentType,
          task: subtask.task,
          status: "pending",
          progress: 0,
        }

        this.subagents.set(subagentID, info)

        Bus.publish(Event.SubagentCreated, {
          subagentID,
          sessionID: session.id,
          type: subtask.agentType,
          task: subtask.task,
        })

        // 启动 Subagent（实际执行由外部系统触发）
        log.info("Subagent created", { subagentID, type: subtask.agentType })
      }
    }

    /**
     * 更新 Subagent 状态
     */
    updateSubagent(input: {
      subagentID: string
      status: SubagentInfo["status"]
      progress?: number
      result?: string
    }): void {
      const info = this.subagents.get(input.subagentID)
      if (!info) {
        log.warn("Subagent not found", { subagentID: input.subagentID })
        return
      }

      info.status = input.status
      if (input.progress !== undefined) info.progress = input.progress
      if (input.result !== undefined) info.result = input.result

      if (input.status === "completed" || input.status === "failed") {
        Bus.publish(Event.SubagentCompleted, {
          subagentID: input.subagentID,
          sessionID: info.sessionID,
          success: input.status === "completed",
          result: input.result,
        })
      }

      // 检查是否所有 Subagent 都已完成
      this.checkCompletion()
    }

    /**
     * 检查是否所有任务已完成
     */
    private checkCompletion(): void {
      const allCompleted = Array.from(this.subagents.values()).every(
        (s) => s.status === "completed" || s.status === "failed",
      )

      if (allCompleted) {
        this.transition("completed")
      }
    }

    /**
     * 状态转换
     */
    private transition(type: StateType, task?: string): void {
      const previousState = this.state.type
      this.state = { type, task, subagents: this.subagents }

      Bus.publish(Event.StateChanged, {
        previousState,
        currentState: type,
        task,
      })

      log.info("State transitioned", { from: previousState, to: type })
    }

    /**
     * 准备接力
     */
    prepareHandoff(reason: string): void {
      this.transition("handoff_preparing", reason)
    }

    /**
     * 获取所有 Subagent 信息
     */
    getSubagents(): SubagentInfo[] {
      return Array.from(this.subagents.values())
    }
  }

  /**
   * 创建 Manager 实例
   */
  export function createManager(sessionID: SessionID): Manager {
    return new Manager(sessionID)
  }
}
