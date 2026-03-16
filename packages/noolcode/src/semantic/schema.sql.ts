import { sqliteTable, text, blob, integer, index } from "drizzle-orm/sqlite-core"
import { SessionTable } from "../session/session.sql"
import { CheckpointTable } from "../context/schema.sql"
import type { SessionID } from "@/session/schema"

/**
 * 语义向量表 - 存储上下文的语义向量用于检索
 */
export const SemanticVectorTable = sqliteTable(
  "semantic_vector",
  {
    id: text().primaryKey(),
    session_id: text()
      .notNull()
      .references(() => SessionTable.id, { onDelete: "cascade" }),
    checkpoint_id: text().references(() => CheckpointTable.id, { onDelete: "set null" }),
    content: text().notNull(),
    content_type: text().notNull(),
    embedding: blob().notNull(),
    embedding_model: text().notNull(),
    scope: text(),
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
