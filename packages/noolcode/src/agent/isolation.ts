import { Log } from "@/util/log"
import { SessionID } from "@/session/schema"
import { CheckpointStore } from "@/context/checkpoint"
import { SemanticIndex } from "@/semantic/index"
import { minimatch } from "minimatch"

/**
 * Subagent 隔离机制 - 确保每个 Subagent 有独立的记忆单元和访问权限
 *
 * 功能：
 * 1. 独立记忆单元
 * 2. 文件访问权限过滤
 * 3. 作用域隔离
 * 4. 按需上下文加载
 */
export namespace SubagentIsolation {
  const log = Log.create({ service: "agent.isolation" })

  // Subagent 角色定义
  export const ROLES = {
    backend: {
      scope: "backend",
      description: "后端开发 - 处理 API、服务层、数据模型",
      allowedPatterns: ["src/api/**", "src/services/**", "src/models/**", "src/repositories/**", "**/*.sql"],
      excludedPatterns: ["src/frontend/**", "src/ui/**", "src/components/**"],
      allowedTools: ["read", "write", "edit", "bash", "grep", "glob"],
    },
    frontend: {
      scope: "frontend",
      description: "前端开发 - 处理 UI 组件、页面、样式",
      allowedPatterns: ["src/components/**", "src/pages/**", "src/styles/**", "src/hooks/**", "public/**"],
      excludedPatterns: ["src/api/**", "src/services/**", "**/*.sql"],
      allowedTools: ["read", "write", "edit", "bash", "grep", "glob"],
    },
    test: {
      scope: "test",
      description: "测试开发 - 编写和维护测试",
      allowedPatterns: ["tests/**", "**/*.test.ts", "**/*.spec.ts", "**/*.test.js", "**/*.spec.js", "jest.config.*", "vitest.config.*"],
      excludedPatterns: [],
      allowedTools: ["read", "write", "edit", "bash", "grep", "glob"],
    },
    explore: {
      scope: "explore",
      description: "代码探索 - 只读访问所有文件进行代码分析",
      allowedPatterns: ["**"],
      excludedPatterns: [],
      allowedTools: ["read", "grep", "glob", "list"],
    },
    docs: {
      scope: "docs",
      description: "文档编写 - 处理文档和说明文件",
      allowedPatterns: ["docs/**", "**/*.md", "**/*.rst", "README*", "CHANGELOG*"],
      excludedPatterns: [],
      allowedTools: ["read", "write", "edit", "grep", "glob"],
    },
    devops: {
      scope: "devops",
      description: "DevOps - 处理配置和部署",
      allowedPatterns: ["**/*.yaml", "**/*.yml", "**/*.json", "Dockerfile*", "docker-compose*", ".github/**", "scripts/**"],
      excludedPatterns: [],
      allowedTools: ["read", "write", "edit", "bash", "grep", "glob"],
    },
    general: {
      scope: "general",
      description: "通用 - 具有较广泛的访问权限",
      allowedPatterns: ["**"],
      excludedPatterns: [],
      allowedTools: ["read", "write", "edit", "bash", "grep", "glob", "webfetch", "websearch"],
    },
  } as const

  export type RoleKey = keyof typeof ROLES
  export type Role = (typeof ROLES)[RoleKey]

  export interface IsolationConfig {
    sessionID: SessionID
    role: RoleKey
    customPatterns?: {
      allowed?: string[]
      excluded?: string[]
    }
  }

  export interface LoadedContext {
    checkpoints: CheckpointStore.Checkpoint[]
    files: string[]
    scope: string
  }

  /**
   * 独立记忆单元 - 每个 Subagent 的隔离记忆
   */
  export class IsolatedMemory {
    private sessionID: SessionID
    private scope: string
    private allowedPatterns: string[]
    private excludedPatterns: string[]
    private allowedTools: string[]

    constructor(config: IsolationConfig) {
      const role = ROLES[config.role]
      this.sessionID = config.sessionID
      this.scope = role.scope
      this.allowedPatterns = [...role.allowedPatterns, ...(config.customPatterns?.allowed ?? [])]
      this.excludedPatterns = [...role.excludedPatterns, ...(config.customPatterns?.excluded ?? [])]
      this.allowedTools = [...role.allowedTools]
    }

    /**
     * 按需加载相关上下文
     */
    async loadRelevantContext(query: string): Promise<LoadedContext> {
      log.info("Loading relevant context", { sessionID: this.sessionID, scope: this.scope, query: query.slice(0, 100) })

      // 1. 语义搜索相关检查点
      const checkpoints = await SemanticIndex.searchCheckpoints({
        query,
        sessionID: this.sessionID,
        scope: this.scope,
        limit: 5,
      })

      // 2. 仅加载允许的文件
      const files = await this.filterAllowedFiles(checkpoints)

      // 3. 构建上下文
      return {
        checkpoints,
        files,
        scope: this.scope,
      }
    }

    /**
     * 权限过滤 - 只保留允许访问的文件
     */
    private async filterAllowedFiles(checkpoints: CheckpointStore.Checkpoint[]): Promise<string[]> {
      const allFiles = checkpoints.flatMap((c) => c.fileChanges?.map((f) => f.path) ?? [])

      const allowedFiles = allFiles.filter((file) => this.isPathAllowed(file))

      log.debug("Filtered files", { total: allFiles.length, allowed: allowedFiles.length })

      return [...new Set(allowedFiles)]
    }

    /**
     * 检查路径是否允许访问
     */
    isPathAllowed(path: string): boolean {
      // 先检查排除模式
      for (const pattern of this.excludedPatterns) {
        if (minimatch(path, pattern)) {
          log.debug("Path excluded", { path, pattern })
          return false
        }
      }

      // 再检查允许模式
      for (const pattern of this.allowedPatterns) {
        if (minimatch(path, pattern)) {
          return true
        }
      }

      // 如果没有匹配任何允许模式，则拒绝
      return false
    }

    /**
     * 检查工具是否允许使用
     */
    isToolAllowed(tool: string): boolean {
      return this.allowedTools.includes(tool)
    }

    /**
     * 获取允许的工具列表
     */
    getAllowedTools(): string[] {
      return [...this.allowedTools]
    }

    /**
     * 获取作用域
     */
    getScope(): string {
      return this.scope
    }

    /**
     * 获取允许的文件模式
     */
    getAllowedPatterns(): string[] {
      return [...this.allowedPatterns]
    }

    /**
     * 获取排除的文件模式
     */
    getExcludedPatterns(): string[] {
      return [...this.excludedPatterns]
    }
  }

  /**
   * 创建隔离记忆单元
   */
  export function createIsolatedMemory(config: IsolationConfig): IsolatedMemory {
    return new IsolatedMemory(config)
  }

  /**
   * 获取角色定义
   */
  export function getRole(key: RoleKey): Role {
    return ROLES[key]
  }

  /**
   * 列出所有可用角色
   */
  export function listRoles(): Array<{ key: RoleKey; role: Role }> {
    return Object.entries(ROLES).map(([key, role]) => ({
      key: key as RoleKey,
      role,
    }))
  }

  /**
   * 根据任务描述推荐角色
   */
  export function recommendRole(task: string): RoleKey {
    const taskLower = task.toLowerCase()

    // 关键词匹配
    if (/api|后端|backend|服务|service|数据库|database|sql/i.test(taskLower)) {
      return "backend"
    }
    if (/前端|frontend|组件|component|ui|页面|page|样式|style|css/i.test(taskLower)) {
      return "frontend"
    }
    if (/测试|test|spec|单元|集成|e2e/i.test(taskLower)) {
      return "test"
    }
    if (/探索|分析|查找|搜索|理解|explore|analyze|search/i.test(taskLower)) {
      return "explore"
    }
    if (/文档|doc|readme|说明|guide/i.test(taskLower)) {
      return "docs"
    }
    if (/部署|deploy|docker|k8s|ci|cd|配置|config|yaml/i.test(taskLower)) {
      return "devops"
    }

    // 默认使用通用角色
    return "general"
  }
}
