# 智能上下文接力系统 (SCRS)

## 概述

智能上下文接力系统解决了某些 LLM（如智谱 GLM-5）在上下文超过阈值后表现急剧下降的问题：

- GLM-5 最大上下文 200K，但最佳体验可能只有 80K
- 每次开新对话需重新构建需求，浪费时间

## 解决方案

设计智能上下文接力系统，实现：
1. 每个模型可配置"最佳推理窗口"
2. 虽超过最佳窗口自动创建新 Session
3. Agent Manager 编排任务和 Subagent
4. 语义索引实现精准上下文恢复
5. Subagent 独立记忆单元，不串角色

## 模块列表

### 模块 1: 模型配置扩展

**文件**: `packages/noolcode/src/provider/models.ts`

扩展 `Model.limit` Schema:
```typescript
context: z.number(),context_optimal: z.number().optional(),  // 最佳推理窗口
context_warning: z.number().optional(),  // 鰚警阈值
```

 type: 'Model.Limit'
```

`

**文件**: `packages/noolcode/src/config/config.ts`

添加 compaction 配置选项
```typescript
compaction: z.object({
  auto: z.boolean().optional(),
  prune: z.boolean().optional(),
  reserved: z.number().optional(),
  relay_enabled: z.boolean().optional(),   // 启用 Session 接力
  relay_strategy: z.enum(["optimal", "warning", "critical"]).optional(),
})
```

---

### 模块 2: 上下文监控器 (Context Monitor)

**文件**: `packages/noolcode/src/context/monitor.ts`

```typescript
export namespace ContextMonitor {
  export type Level = "normal" | "warning" | "optimal" | "critical"

  export interface Status {
    level: Level
    currentTokens: number
    maxContext: number
    optimalContext: number
    warningContext: number
    percentUsed: number
    shouldRelay: boolean
  }

  export async function check(input: {
    tokens: TokenInfo
    model: { limit: ModelLimit }
  }): Promise<Status>

}
```

---

### 模块 3: Session 接力管理器

**文件**: `packages/noolcode/src/context/relay.ts`

```typescript
export namespace SessionRelay
  export async function relay(input: {
    sessionID: SessionID
    reason: RelayReason
    ...
  }): Promise<{ newSession: Session.Info; checkpoint: CheckpointStore.Checkpoint }>
}
```
- 壴立接力链关系
- 维护接力历史
- 支持上下文恢复
```

---

### 模块 4: 检查点存储
**文件**: `packages/noolcode/src/context/checkpoint.ts`

```typescript
export namespace CheckpointStore
  export async function save(input: {
    sessionID: SessionID
    type: CheckpointType
    contextSummary: string
    ...
  }): Promise<Checkpoint>
}
```

- 按需加载恢复上下文
- 支持过期清理
```
---

### 模块 5: Agent Manager 状态机
**文件**: `packages/noolcode/src/agent/manager.ts`

```typescript
export namespace AgentManager
  export class Manager {
    private state: State = { type: "idle" }

    async analyze(task: string): Promise<ExecutionPlan>
    async execute(plan: ExecutionPlan): Promise<void>
  }
}
```
- 任务复杂度评估
- 任务分解
- Subagent 生命周期管理
```
---

### 模块 6: Subagent 通信协议
**文件**: `packages/noolcode/src/agent/protocol.ts`

```typescript
export namespace AgentProtocol
  // 消息类型
  export const MessageSchema = z.discriminatedUnion("type", [
    TaskAssignMessage,
    ProgressMessage
    ResultMessage
    HandoffMessage
  ])

  export async function send(input: { message: Message; sessionID: SessionID })
  export async function acknowledge(messageID: string)
}
```
- 消息验证
- 确认机制
- 消息持久化
```
---

### 模块 7: Subagent 隔离机制
**文件**: `packages/noolcode/src/agent/isolation.ts`

```typescript
export namespace SubagentIsolation
  export class IsolatedMemory {
    async loadRelevantContext(query: string): Promise<LoadedContext>
  }

  export const ROLES = {
    backend: { scope: "backend", allowedPatterns: [...], excludedPatterns: [...] },
    frontend: { scope: "frontend", allowedPatterns: [...], excludedPatterns: [...] },
    test: { scope: "test", allowedPatterns: [...] },
    explore: { scope: "explore", allowedPatterns: ["**"] },
    docs: { scope: "docs", allowedPatterns: [...] },
    devops: { scope: "devops", allowedPatterns: [...] },
    general: { scope: "general", allowedPatterns: ["**"] },
  }
}
```
- 独立记忆单元
- 文件访问权限过滤
- 作用域隔离
- 按需上下文加载
```
---

### 模块 8: 语义向量存储
**文件**: `packages/noolcode/src/semantic/index.ts`

```typescript
export namespace SemanticIndex
  export async function embed(text: string): Promise<Float32Array>
  export async function index(input: { sessionID, content, contentType, ... })
  export async function search(input: { query, ... }): Promise<SearchResult[]>
  export async function cleanupExpired(): Promise<number>
}
```
- 文本嵌入生成
- 语义相似度搜索
- 按作用域过滤
- 自动过期清理
```
---

### 模块 9: 清理策略
**文件**: `packages/noolcode/src/context/cleanup.ts`

```typescript
export namespace ContextCleanup
  const RETENTION_DAYS = 30

  export async function run(input?: { retentionDays?: number; dryRun?: boolean }): Promise<CleanupResult>

  export function register(): void // 注册定时清理任务
}
```
- 检查点清理
- 向量清理
- 消息清理
- 接力链清理
```
---

### 数据库 Schema

**文件**: `packages/noolcode/src/context/schema.sql.ts`

```typescript
export const CheckpointTable = sqliteTable("context_checkpoint", ...)
export const RelayChainTable = sqliteTable("relay_chain", ...)
export const AgentMessageTable = sqliteTable("agent_message", ...)
export const SemanticVectorTable = sqliteTable("semantic_vector", ...)
```
```

---

## 配置示例

```json
{
  "provider": {
    "zhipu": {
      "models": {
        "glm-5": {
          "limit": {
            "context": 200000,
            "context_optimal": 80000,
            "context_warning": 60000,
            "output": 8192
          }
        }
      }
    }
  },
  "compaction": {
    "auto": true,
    "prune": true,
    "relay_enabled": true,
    "relay_strategy": "optimal"
  }
}
```
