function truthy(key: string) {
  const value = process.env[key]?.toLowerCase()
  return value === "true" || value === "1"
}

function falsy(key: string) {
  const value = process.env[key]?.toLowerCase()
  return value === "false" || value === "0"
}

export namespace Flag {
  export const NOOLCODE_AUTO_SHARE = truthy("NOOLCODE_AUTO_SHARE")
  export const NOOLCODE_GIT_BASH_PATH = process.env["NOOLCODE_GIT_BASH_PATH"]
  export const NOOLCODE_CONFIG = process.env["NOOLCODE_CONFIG"]
  export declare const NOOLCODE_TUI_CONFIG: string | undefined
  export declare const NOOLCODE_CONFIG_DIR: string | undefined
  export const NOOLCODE_CONFIG_CONTENT = process.env["NOOLCODE_CONFIG_CONTENT"]
  export const NOOLCODE_DISABLE_AUTOUPDATE = truthy("NOOLCODE_DISABLE_AUTOUPDATE")
  export const NOOLCODE_DISABLE_PRUNE = truthy("NOOLCODE_DISABLE_PRUNE")
  export const NOOLCODE_DISABLE_TERMINAL_TITLE = truthy("NOOLCODE_DISABLE_TERMINAL_TITLE")
  export const NOOLCODE_PERMISSION = process.env["NOOLCODE_PERMISSION"]
  export const NOOLCODE_DISABLE_DEFAULT_PLUGINS = truthy("NOOLCODE_DISABLE_DEFAULT_PLUGINS")
  export const NOOLCODE_DISABLE_LSP_DOWNLOAD = truthy("NOOLCODE_DISABLE_LSP_DOWNLOAD")
  export const NOOLCODE_ENABLE_EXPERIMENTAL_MODELS = truthy("NOOLCODE_ENABLE_EXPERIMENTAL_MODELS")
  export const NOOLCODE_DISABLE_AUTOCOMPACT = truthy("NOOLCODE_DISABLE_AUTOCOMPACT")
  export const NOOLCODE_DISABLE_MODELS_FETCH = truthy("NOOLCODE_DISABLE_MODELS_FETCH")
  export const NOOLCODE_DISABLE_CLAUDE_CODE = truthy("NOOLCODE_DISABLE_CLAUDE_CODE")
  export const NOOLCODE_DISABLE_CLAUDE_CODE_PROMPT =
    NOOLCODE_DISABLE_CLAUDE_CODE || truthy("NOOLCODE_DISABLE_CLAUDE_CODE_PROMPT")
  export const NOOLCODE_DISABLE_CLAUDE_CODE_SKILLS =
    NOOLCODE_DISABLE_CLAUDE_CODE || truthy("NOOLCODE_DISABLE_CLAUDE_CODE_SKILLS")
  export const NOOLCODE_DISABLE_EXTERNAL_SKILLS =
    NOOLCODE_DISABLE_CLAUDE_CODE_SKILLS || truthy("NOOLCODE_DISABLE_EXTERNAL_SKILLS")
  export declare const NOOLCODE_DISABLE_PROJECT_CONFIG: boolean
  export const NOOLCODE_FAKE_VCS = process.env["NOOLCODE_FAKE_VCS"]
  export declare const NOOLCODE_CLIENT: string
  export const NOOLCODE_SERVER_PASSWORD = process.env["NOOLCODE_SERVER_PASSWORD"]
  export const NOOLCODE_SERVER_USERNAME = process.env["NOOLCODE_SERVER_USERNAME"]
  export const NOOLCODE_ENABLE_QUESTION_TOOL = truthy("NOOLCODE_ENABLE_QUESTION_TOOL")

  // Experimental
  export const NOOLCODE_EXPERIMENTAL = truthy("NOOLCODE_EXPERIMENTAL")
  export const NOOLCODE_EXPERIMENTAL_FILEWATCHER = truthy("NOOLCODE_EXPERIMENTAL_FILEWATCHER")
  export const NOOLCODE_EXPERIMENTAL_DISABLE_FILEWATCHER = truthy("NOOLCODE_EXPERIMENTAL_DISABLE_FILEWATCHER")
  export const NOOLCODE_EXPERIMENTAL_ICON_DISCOVERY =
    NOOLCODE_EXPERIMENTAL || truthy("NOOLCODE_EXPERIMENTAL_ICON_DISCOVERY")

  const copy = process.env["NOOLCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"]
  export const NOOLCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT =
    copy === undefined ? process.platform === "win32" : truthy("NOOLCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT")
  export const NOOLCODE_ENABLE_EXA =
    truthy("NOOLCODE_ENABLE_EXA") || NOOLCODE_EXPERIMENTAL || truthy("NOOLCODE_EXPERIMENTAL_EXA")
  export const NOOLCODE_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS = number("NOOLCODE_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS")
  export const NOOLCODE_EXPERIMENTAL_OUTPUT_TOKEN_MAX = number("NOOLCODE_EXPERIMENTAL_OUTPUT_TOKEN_MAX")
  export const NOOLCODE_EXPERIMENTAL_OXFMT = NOOLCODE_EXPERIMENTAL || truthy("NOOLCODE_EXPERIMENTAL_OXFMT")
  export const NOOLCODE_EXPERIMENTAL_LSP_TY = truthy("NOOLCODE_EXPERIMENTAL_LSP_TY")
  export const NOOLCODE_EXPERIMENTAL_LSP_TOOL = NOOLCODE_EXPERIMENTAL || truthy("NOOLCODE_EXPERIMENTAL_LSP_TOOL")
  export const NOOLCODE_DISABLE_FILETIME_CHECK = truthy("NOOLCODE_DISABLE_FILETIME_CHECK")
  export const NOOLCODE_EXPERIMENTAL_PLAN_MODE = NOOLCODE_EXPERIMENTAL || truthy("NOOLCODE_EXPERIMENTAL_PLAN_MODE")
  export const NOOLCODE_EXPERIMENTAL_WORKSPACES = NOOLCODE_EXPERIMENTAL || truthy("NOOLCODE_EXPERIMENTAL_WORKSPACES")
  export const NOOLCODE_EXPERIMENTAL_MARKDOWN = !falsy("NOOLCODE_EXPERIMENTAL_MARKDOWN")
  export const NOOLCODE_MODELS_URL = process.env["NOOLCODE_MODELS_URL"]
  export const NOOLCODE_MODELS_PATH = process.env["NOOLCODE_MODELS_PATH"]
  export const NOOLCODE_DISABLE_CHANNEL_DB = truthy("NOOLCODE_DISABLE_CHANNEL_DB")
  export const NOOLCODE_SKIP_MIGRATIONS = truthy("NOOLCODE_SKIP_MIGRATIONS")
  export const NOOLCODE_STRICT_CONFIG_DEPS = truthy("NOOLCODE_STRICT_CONFIG_DEPS")

  function number(key: string) {
    const value = process.env[key]
    if (!value) return undefined
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
  }
}

// Dynamic getter for NOOLCODE_DISABLE_PROJECT_CONFIG
// This must be evaluated at access time, not module load time,
// because external tooling may set this env var at runtime
Object.defineProperty(Flag, "NOOLCODE_DISABLE_PROJECT_CONFIG", {
  get() {
    return truthy("NOOLCODE_DISABLE_PROJECT_CONFIG")
  },
  enumerable: true,
  configurable: false,
})

// Dynamic getter for NOOLCODE_TUI_CONFIG
// This must be evaluated at access time, not module load time,
// because tests and external tooling may set this env var at runtime
Object.defineProperty(Flag, "NOOLCODE_TUI_CONFIG", {
  get() {
    return process.env["NOOLCODE_TUI_CONFIG"]
  },
  enumerable: true,
  configurable: false,
})

// Dynamic getter for NOOLCODE_CONFIG_DIR
// This must be evaluated at access time, not module load time,
// because external tooling may set this env var at runtime
Object.defineProperty(Flag, "NOOLCODE_CONFIG_DIR", {
  get() {
    return process.env["NOOLCODE_CONFIG_DIR"]
  },
  enumerable: true,
  configurable: false,
})

// Dynamic getter for NOOLCODE_CLIENT
// This must be evaluated at access time, not module load time,
// because some commands override the client at runtime
Object.defineProperty(Flag, "NOOLCODE_CLIENT", {
  get() {
    return process.env["NOOLCODE_CLIENT"] ?? "cli"
  },
  enumerable: true,
  configurable: false,
})
