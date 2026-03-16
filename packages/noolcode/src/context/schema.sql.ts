import { sqliteTable, text, integer, index, blob } from "drizzle-orm/sqlite-core"
import { SessionTable } from "../session/session.sql"
import type { SessionID } from "../session/schema"

/**
 * 检查点数据类型
 */
export interface TaskState {
  currentTask?: string
  pendingTasks: string[]
  completedTasks: string[]
  findings: string[]
  relevantFiles: string[]
}

export interface FileChange {
  path: string
  action: "created" | "modified" | "deleted"
  summary?: string
}

/**
 * 检查点表 - 存储 Session 接力前的状态快照
 */
export const CheckpointTable = sqliteTable(
  "context_checkpoint",
  {
    id: text().primaryKey(),
    session_id: text()
      .$type<SessionID>()
      .notNull()
      .references(() => SessionTable.id, { onDelete: "cascade" }),
    type: text().notNull(), // 'pre_handoff' | 'post_compact' | 'manual'
    context_summary: text().notNull(),
    task_state: text({ mode: "json" }).$type<TaskState>(),
    file_changes: text({ mode: "json" }).$type<FileChange[]>(),
    embedding: blob(), // 语义向量（可选）
    time_created: integer().notNull(),
    time_expires: integer(), // 过期时间
  },
  (table) => [
    index("checkpoint_session_idx").on(table.session_id),
    index("checkpoint_time_created_idx").on(table.time_created),
    index("checkpoint_type_idx").on(table.type),
  ],
)

/**
 * 接力链表 - 记录 Session 之间的接力关系
 */
export const RelayChainTable = sqliteTable(
  "relay_chain",
  {
    id: text().primaryKey(),
    from_session_id: text()
      .$type<SessionID>()
      .notNull()
      .references(() => SessionTable.id, { onDelete: "cascade" }),
    to_session_id: text()
      .$type<SessionID>()
      .notNull()
      .references(() => SessionTable.id, { onDelete: "cascade" }),
    checkpoint_id: text()
      .notNull()
      .references(() => CheckpointTable.id, { onDelete: "cascade" }),
    reason: text().notNull(), // 'optimal' | 'critical' | 'manual'
    tokens_at_relay: integer().notNull(),
    time_created: integer().notNull(),
  },
  (table) => [
    index("relay_from_session_idx").on(table.from_session_id),
    index("relay_to_session_idx").on(table.to_session_id),
    index("relay_checkpoint_idx").on(table.checkpoint_id),
  ],
)

/**
 * Agent 消息表 - 存储 Agent 之间的通信消息
 */
export const AgentMessageTable = sqliteTable(
  "agent_message",
  {
    id: text().primaryKey(),
    session_id: text()
      .$type<SessionID>()
      .notNull()
      .references(() => SessionTable.id, { onDelete: "cascade" }),
    from_session_id: text().$type<SessionID>().notNull(),
    to_session_id: text().$type<SessionID>().notNull(),
    type: text().notNull(), // 'task_assign' | 'progress' | 'result' | 'handoff'
    payload: text({ mode: "json" }).notNull(),
    status: text().notNull(), // 'pending' | 'delivered' | 'acknowledged' | 'failed'
    time_created: integer().notNull(),
    time_delivered: integer(),
    time_acknowledged: integer(),
  },
  (table) => [
    index("agent_message_session_idx").on(table.session_id),
    index("agent_message_from_session_idx").on(table.from_session_id),
    index("agent_message_to_session_idx").on(table.to_session_id),
    index("agent_message_status_idx").on(table.status),
  ],
)

/**
 * 语义向量表 - 存储上下文的语义向量用于检索
 */
export const SemanticVectorTable = sqliteTable(
  "semantic_vector",
  {
    id: text().primaryKey(),
    session_id: text()
      .$type<SessionID>()
      .notNull()
      .references(() => SessionTable.id, { onDelete: "cascade" }),
    checkpoint_id: text().references(() => CheckpointTable.id, { onDelete: "set null" }),
    content: text().notNull(),
    content_type: text().notNull(), // 'task' | 'finding' | 'code' | 'summary'
    embedding: blob().notNull(),
    embedding_model: text().notNull(),
    scope: text(), // 子 agent 作用域
    time_created: integer().notNull(),
    time_expires: integer(),
  },
  (table) => [
    index("semantic_vector_session_idx").on(table.session_id),
    index("semantic_vector_checkpoint_idx").on(table.checkpoint_id),
    index("semantic_vector_content_type_idx").on(table.content_type),
    index("semantic_vector_scope_idx").on(table.scope),
  ],
)
