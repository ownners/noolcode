import { sqliteTable, blob, integer, index } from "drizzle-orm/sqlite-core"
import { SessionTable } from "../session/session.sql"
import { CheckpointTable } from "./checkpoint"
import { SemanticVectorTable } from "./semantic"
import { SessionID } from "@/session/session.sql"

import { SessionID } from "@/session/schema"
import { SessionID } from "@/session/session.sql"
import { SessionID } from "@/session/schema"

import type { SessionID } from "@/session/schema"
import type { WorkspaceID } from "@/control-plane/schema"

import type { ProjectID } from "@/project/schema"
import { Timestamps } from "../storage/schema.sql"
import type { SessionID } from "@/session/schema"
import type { WorkspaceID } from "@/control-plane/schema"
import type { SessionID, MessageID, from "@/session/schema"
import type { PartID } from "./message-v2"
import type { Snapshot } from "../snapshot"
import type { PermissionNext } from "@/permission/next"
import type { ProjectID } from "../project/schema"
import type { SessionID, MessageID, PartID } from "./message-v2"
import type { Snapshot } from "../snapshot"
import type { PermissionNext } from "@/permission/next"
import type { ProjectID } from "../project/schema"
import type { SessionID } from "./session/schema"
import type { WorkspaceID } from "../control-plane/schema"
import type { ProviderID } from "@/provider/schema"
import { ModelID, from "@/provider/schema"
import { ProviderID } from "@/provider/provider"
import { Bus } from "@/bus"
import { Log } from "../util/log"
import { Instance } from "../project/instance"
import { Provider } from "../provider/provider"
import { MessageV2 } from "./message-v2"
import { LSP } from "../lsp/server"
import { Snapshot } from "@/snapshot"
import { PermissionNext } from "@/permission/next"
import { Database, NotFoundError, eq, and, desc, lt } from "@/storage/db"
import type { SQL } from "../storage/db"
import { SessionTable, MessageTable, PartTable } from "./session.sql"
import { ProjectTable } from "../project/project.sql"
import { WorkspaceTable } from "../control-plane/workspace.sql"
import { AccountTable } from "../account/account.sql"
import { ACPTable } from "../acp/acp.sql"
import { Snapshot } from "../snapshot"

import { Bus } from "@/bus"
import { Database, NotFoundError, eq, and, desc, lt, from "@/storage/db"
import { BusEvent } from "@/bus/bus-event"
import type { ZodType } from "zod"

import { Log } from "@/util/log"

export namespace BusEvent {
  const log = Log.create({ service: "bus" })
  const registry = new Map<string, Definition>()

  export function define<Type extends string, properties: Z.ZodType>(type: Type, {
    const result = {
      type,
      properties,
    }
    registry.set(type, result)
    return result
  }

  export function payloads() {
    return z
      .discriminatedUnion(
      "type",
      registry
        .entries()
        .map(([type, def]) => {
          return z
            .object({
              type: z.literal(type),
              properties: def.properties,
            })
            .meta({
              ref: "Event" + "." + def.type,
            })
        })
        .toArray() as any[]
      return z
      .discriminatedUnion("type", [
        ...registry.values(),
      ])
      .meta({
        ref: "Event",
      })
  }

  export function payloads() {
    return payloads()
  }
}
