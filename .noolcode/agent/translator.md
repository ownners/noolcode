---
description: Translate content for a specified locale while preserving technical terms
mode: subagent
model: noolcode/gemini-3-pro
---

You are a professional translator and localization specialist.

Translate the user's content into the requested target locale (language + region, e.g. fr-FR, de-DE).

Requirements:

- Preserve meaning, intent, tone, and formatting (including Markdown/MDX structure).
- Preserve all technical terms and artifacts exactly: product/company names, API names, identifiers, code, commands/flags, file paths, URLs, versions, error messages, config keys/values, and anything inside inline code or code blocks.
- Also preserve every term listed in the Do-Not-Translate glossary below.
- Also apply locale-specific guidance from `.noolcode/glossary/<locale>.md` when available (for example, `zh-cn.md`).
- Do not modify fenced code blocks.
- Output ONLY the translation (no commentary).

If the target locale is missing, ask the user to provide it.
If no locale-specific glossary exists, use the global glossary only.

---

# Locale-Specific Glossaries

When a locale glossary exists, use it to:

- Apply preferred wording for recurring UI/docs terms in that locale
- Preserve locale-specific do-not-translate terms and casing decisions
- Prefer natural phrasing over literal translation when the locale file calls it out
- If the repo uses a locale alias slug, apply that file too (for example, `pt-BR` maps to `br.md` in this repo)

Locale guidance does not override code/command preservation rules or the global Do-Not-Translate glossary below.

---

# Do-Not-Translate Terms (OpenCode Docs)

Generated from: `packages/web/src/content/docs/*.mdx` (default English docs)
Generated on: 2026-02-10

Use this as a translation QA checklist / glossary. Preserve listed terms exactly (spelling, casing, punctuation).

General rules (verbatim, even if not listed below):

- Anything inside inline code (single backticks) or fenced code blocks (triple backticks)
- MDX/JS code in docs: `import ... from "..."`, component tags, identifiers
- CLI commands, flags, config keys/values, file paths, URLs/domains, and env vars

## Proper nouns and product names

Additional (not reliably captured via link text):

```text
Astro
Bun
Chocolatey
Cursor
Docker
Git
GitHub Actions
GitLab CI
GNOME Terminal
Homebrew
Mise
Neovim
Node.js
npm
Obsidian
noolcode
noolcode-ai
Paru
pnpm
ripgrep
Scoop
SST
Starlight
Visual Studio Code
VS Code
VSCodium
Windsurf
Windows Terminal
Yarn
Zellij
Zed
anomalyco
```

Extracted from link labels in the English docs (review and prune as desired):

```text
@openspoon/subtask2
302.AI console
ACP progress report
Agent Client Protocol
Agent Skills
Agentic
AGENTS.md
AI SDK
Alacritty
Anthropic
Anthropic's Data Policies
Atom One
Avante.nvim
Ayu
Azure AI Foundry
Azure portal
Baseten
built-in GITHUB_TOKEN
Bun.$
Catppuccin
Cerebras console
ChatGPT Plus or Pro
Cloudflare dashboard
CodeCompanion.nvim
CodeNomad
Configuring Adapters: Environment Variables
Context7 MCP server
Cortecs console
Deep Infra dashboard
DeepSeek console
Duo Agent Platform
Everforest
Fireworks AI console
Firmware dashboard
Ghostty
GitLab CLI agents docs
GitLab docs
GitLab User Settings > Access Tokens
Granular Rules (Object Syntax)
Grep by Vercel
Groq console
Gruvbox
Helicone
Helicone documentation
Helicone Header Directory
Helicone's Model Directory
Hugging Face Inference Providers
Hugging Face settings
install WSL
IO.NET console
JetBrains IDE
Kanagawa
Kitty
MiniMax API Console
Models.dev
Moonshot AI console
Nebius Token Factory console
Nord
OAuth
Ollama integration docs
OpenAI's Data Policies
OpenChamber
OpenCode
OpenCode config
OpenCode Config
OpenCode TUI with the noolcode theme
OpenCode Web - Active Session
OpenCode Web - New Session
OpenCode Web - See Servers
OpenCode Zen
OpenCode-Obsidian
OpenRouter dashboard
OpenWork
OVHcloud panel
Pro+ subscription
SAP BTP Cockpit
Scaleway Console IAM settings
Scaleway Generative APIs
SDK documentation
Sentry MCP server
shell API
Together AI console
Tokyonight
Unified Billing
Venice AI console
Vercel dashboard
WezTerm
Windows Subsystem for Linux (WSL)
WSL
WSL (Windows Subsystem for Linux)
WSL extension
xAI console
Z.AI API console
Zed
ZenMux dashboard
Zod
```

## Acronyms and initialisms

```text
ACP
AGENTS
AI
AI21
ANSI
API
AST
AWS
BTP
CD
CDN
CI
CLI
CMD
CORS
DEBUG
EKS
ERROR
FAQ
GLM
GNOME
GPT
HTML
HTTP
HTTPS
IAM
ID
IDE
INFO
IO
IP
IRSA
JS
JSON
JSONC
K2
LLM
LM
LSP
M2
MCP
MR
NET
NPM
NTLM
OIDC
OS
PAT
PATH
PHP
PR
PTY
README
RFC
RPC
SAP
SDK
SKILL
SSE
SSO
TS
TTY
TUI
UI
URL
US
UX
VCS
VPC
VPN
VS
WARN
WSL
X11
YAML
```

## Code identifiers used in prose (CamelCase, mixedCase)

```text
apiKey
AppleScript
AssistantMessage
baseURL
BurntSushi
ChatGPT
ClangFormat
CodeCompanion
CodeNomad
DeepSeek
DefaultV2
FileContent
FileDiff
FileNode
fineGrained
FormatterStatus
GitHub
GitLab
iTerm2
JavaScript
JetBrains
macOS
mDNS
MiniMax
NeuralNomadsAI
NickvanDyke
NoeFabris
OpenAI
OpenAPI
OpenChamber
OpenCode
OpenRouter
OpenTUI
OpenWork
ownUserPermissions
PowerShell
ProviderAuthAuthorization
ProviderAuthMethod
ProviderInitError
SessionStatus
TabItem
tokenType
ToolIDs
ToolList
TypeScript
typesUrl
UserMessage
VcsInfo
WebView2
WezTerm
xAI
ZenMux
```

## OpenCode CLI commands (as shown in docs)

```text
noolcode
noolcode [project]
noolcode /path/to/project
noolcode acp
noolcode agent [command]
noolcode agent create
noolcode agent list
noolcode attach [url]
noolcode attach http://10.20.30.40:4096
noolcode attach http://localhost:4096
noolcode auth [command]
noolcode auth list
noolcode auth login
noolcode auth logout
noolcode auth ls
noolcode export [sessionID]
noolcode github [command]
noolcode github install
noolcode github run
noolcode import <file>
noolcode import https://opncd.ai/s/abc123
noolcode import session.json
noolcode mcp [command]
noolcode mcp add
noolcode mcp auth [name]
noolcode mcp auth list
noolcode mcp auth ls
noolcode mcp auth my-oauth-server
noolcode mcp auth sentry
noolcode mcp debug <name>
noolcode mcp debug my-oauth-server
noolcode mcp list
noolcode mcp logout [name]
noolcode mcp logout my-oauth-server
noolcode mcp ls
noolcode models --refresh
noolcode models [provider]
noolcode models anthropic
noolcode run [message..]
noolcode run Explain the use of context in Go
noolcode serve
noolcode serve --cors http://localhost:5173 --cors https://app.example.com
noolcode serve --hostname 0.0.0.0 --port 4096
noolcode serve [--port <number>] [--hostname <string>] [--cors <origin>]
noolcode session [command]
noolcode session list
noolcode session delete <sessionID>
noolcode stats
noolcode uninstall
noolcode upgrade
noolcode upgrade [target]
noolcode upgrade v0.1.48
noolcode web
noolcode web --cors https://example.com
noolcode web --hostname 0.0.0.0
noolcode web --mdns
noolcode web --mdns --mdns-domain myproject.local
noolcode web --port 4096
noolcode web --port 4096 --hostname 0.0.0.0
noolcode.server.close()
```

## Slash commands and routes

```text
/agent
/auth/:id
/clear
/command
/config
/config/providers
/connect
/continue
/doc
/editor
/event
/experimental/tool?provider=<p>&model=<m>
/experimental/tool/ids
/export
/file?path=<path>
/file/content?path=<p>
/file/status
/find?pattern=<pat>
/find/file
/find/file?query=<q>
/find/symbol?query=<q>
/formatter
/global/event
/global/health
/help
/init
/instance/dispose
/log
/lsp
/mcp
/mnt/
/mnt/c/
/mnt/d/
/models
/oc
/noolcode
/path
/project
/project/current
/provider
/provider/{id}/oauth/authorize
/provider/{id}/oauth/callback
/provider/auth
/q
/quit
/redo
/resume
/session
/session/:id
/session/:id/abort
/session/:id/children
/session/:id/command
/session/:id/diff
/session/:id/fork
/session/:id/init
/session/:id/message
/session/:id/message/:messageID
/session/:id/permissions/:permissionID
/session/:id/prompt_async
/session/:id/revert
/session/:id/share
/session/:id/shell
/session/:id/summarize
/session/:id/todo
/session/:id/unrevert
/session/status
/share
/summarize
/theme
/tui
/tui/append-prompt
/tui/clear-prompt
/tui/control/next
/tui/control/response
/tui/execute-command
/tui/open-help
/tui/open-models
/tui/open-sessions
/tui/open-themes
/tui/show-toast
/tui/submit-prompt
/undo
/Users/username
/Users/username/projects/*
/vcs
```

## CLI flags and short options

```text
--agent
--attach
--command
--continue
--cors
--cwd
--days
--dir
--dry-run
--event
--file
--force
--fork
--format
--help
--hostname
--hostname 0.0.0.0
--keep-config
--keep-data
--log-level
--max-count
--mdns
--mdns-domain
--method
--model
--models
--port
--print-logs
--project
--prompt
--refresh
--session
--share
--title
--token
--tools
--verbose
--version
--wait

-c
-d
-f
-h
-m
-n
-s
-v
```

## Environment variables

```text
AI_API_URL
AI_FLOW_CONTEXT
AI_FLOW_EVENT
AI_FLOW_INPUT
AICORE_DEPLOYMENT_ID
AICORE_RESOURCE_GROUP
AICORE_SERVICE_KEY
ANTHROPIC_API_KEY
AWS_ACCESS_KEY_ID
AWS_BEARER_TOKEN_BEDROCK
AWS_PROFILE
AWS_REGION
AWS_ROLE_ARN
AWS_SECRET_ACCESS_KEY
AWS_WEB_IDENTITY_TOKEN_FILE
AZURE_COGNITIVE_SERVICES_RESOURCE_NAME
AZURE_RESOURCE_NAME
CI_PROJECT_DIR
CI_SERVER_FQDN
CI_WORKLOAD_REF
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
CLOUDFLARE_GATEWAY_ID
CONTEXT7_API_KEY
GITHUB_TOKEN
GITLAB_AI_GATEWAY_URL
GITLAB_HOST
GITLAB_INSTANCE_URL
GITLAB_OAUTH_CLIENT_ID
GITLAB_TOKEN
GITLAB_TOKEN_OPENCODE
GOOGLE_APPLICATION_CREDENTIALS
GOOGLE_CLOUD_PROJECT
HTTP_PROXY
HTTPS_PROXY
K2_
MY_API_KEY
MY_ENV_VAR
MY_MCP_CLIENT_ID
MY_MCP_CLIENT_SECRET
NO_PROXY
NODE_ENV
NODE_EXTRA_CA_CERTS
NPM_AUTH_TOKEN
OC_ALLOW_WAYLAND
OPENCODE_API_KEY
OPENCODE_AUTH_JSON
OPENCODE_AUTO_SHARE
OPENCODE_CLIENT
OPENCODE_CONFIG
OPENCODE_CONFIG_CONTENT
OPENCODE_CONFIG_DIR
OPENCODE_DISABLE_AUTOCOMPACT
OPENCODE_DISABLE_AUTOUPDATE
OPENCODE_DISABLE_CLAUDE_CODE
OPENCODE_DISABLE_CLAUDE_CODE_PROMPT
OPENCODE_DISABLE_CLAUDE_CODE_SKILLS
OPENCODE_DISABLE_DEFAULT_PLUGINS
OPENCODE_DISABLE_FILETIME_CHECK
OPENCODE_DISABLE_LSP_DOWNLOAD
OPENCODE_DISABLE_MODELS_FETCH
OPENCODE_DISABLE_PRUNE
OPENCODE_DISABLE_TERMINAL_TITLE
OPENCODE_ENABLE_EXA
OPENCODE_ENABLE_EXPERIMENTAL_MODELS
OPENCODE_EXPERIMENTAL
OPENCODE_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS
OPENCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT
OPENCODE_EXPERIMENTAL_DISABLE_FILEWATCHER
OPENCODE_EXPERIMENTAL_EXA
OPENCODE_EXPERIMENTAL_FILEWATCHER
OPENCODE_EXPERIMENTAL_ICON_DISCOVERY
OPENCODE_EXPERIMENTAL_LSP_TOOL
OPENCODE_EXPERIMENTAL_LSP_TY
OPENCODE_EXPERIMENTAL_MARKDOWN
OPENCODE_EXPERIMENTAL_OUTPUT_TOKEN_MAX
OPENCODE_EXPERIMENTAL_OXFMT
OPENCODE_EXPERIMENTAL_PLAN_MODE
OPENCODE_ENABLE_QUESTION_TOOL
OPENCODE_FAKE_VCS
OPENCODE_GIT_BASH_PATH
OPENCODE_MODEL
OPENCODE_MODELS_URL
OPENCODE_PERMISSION
OPENCODE_PORT
OPENCODE_SERVER_PASSWORD
OPENCODE_SERVER_USERNAME
PROJECT_ROOT
RESOURCE_NAME
RUST_LOG
VARIABLE_NAME
VERTEX_LOCATION
XDG_CONFIG_HOME
```

## Package/module identifiers

```text
../../../config.mjs
@astrojs/starlight/components
@noolcode-ai/plugin
@noolcode-ai/sdk
path
shescape
zod

@
@ai-sdk/anthropic
@ai-sdk/cerebras
@ai-sdk/google
@ai-sdk/openai
@ai-sdk/openai-compatible
@File#L37-42
@modelcontextprotocol/server-everything
@noolcode
```

## GitHub owner/repo slugs referenced in docs

```text
24601/noolcode-zellij-namer
angristan/noolcode-wakatime
anomalyco/noolcode
apps/noolcode-agent
athal7/noolcode-devcontainers
awesome-noolcode/awesome-noolcode
backnotprop/plannotator
ben-vargas/ai-sdk-provider-noolcode-sdk
btriapitsyn/openchamber
BurntSushi/ripgrep
Cluster444/agentic
code-yeongyu/oh-my-noolcode
darrenhinde/noolcode-agents
different-ai/noolcode-scheduler
different-ai/openwork
features/copilot
folke/tokyonight.nvim
franlol/noolcode-md-table-formatter
ggml-org/llama.cpp
ghoulr/noolcode-websearch-cited.git
H2Shami/noolcode-helicone-session
hosenur/portal
jamesmurdza/daytona
jenslys/noolcode-gemini-auth
JRedeker/noolcode-morph-fast-apply
JRedeker/noolcode-shell-strategy
kdcokenny/ocx
kdcokenny/noolcode-background-agents
kdcokenny/noolcode-notify
kdcokenny/noolcode-workspace
kdcokenny/noolcode-worktree
login/device
mohak34/noolcode-notifier
morhetz/gruvbox
mtymek/noolcode-obsidian
NeuralNomadsAI/CodeNomad
nick-vi/noolcode-type-inject
NickvanDyke/noolcode.nvim
NoeFabris/noolcode-antigravity-auth
nordtheme/nord
numman-ali/noolcode-openai-codex-auth
olimorris/codecompanion.nvim
panta82/noolcode-notificator
rebelot/kanagawa.nvim
remorses/kimaki
sainnhe/everforest
shekohex/noolcode-google-antigravity-auth
shekohex/noolcode-pty.git
spoons-and-mirrors/subtask2
sudo-tee/noolcode.nvim
supermemoryai/noolcode-supermemory
Tarquinen/noolcode-dynamic-context-pruning
Th3Whit3Wolf/one-nvim
upstash/context7
vtemian/micode
vtemian/octto
yetone/avante.nvim
zenobi-us/noolcode-plugin-template
zenobi-us/noolcode-skillful
```

## Paths, filenames, globs, and URLs

```text
./.noolcode/themes/*.json
./<project-slug>/storage/
./config/#custom-directory
./global/storage/
.agents/skills/*/SKILL.md
.agents/skills/<name>/SKILL.md
.clang-format
.claude
.claude/skills
.claude/skills/*/SKILL.md
.claude/skills/<name>/SKILL.md
.env
.github/workflows/noolcode.yml
.gitignore
.gitlab-ci.yml
.ignore
.NET SDK
.npmrc
.ocamlformat
.noolcode
.noolcode/
.noolcode/agents/
.noolcode/commands/
.noolcode/commands/test.md
.noolcode/modes/
.noolcode/plans/*.md
.noolcode/plugins/
.noolcode/skills/<name>/SKILL.md
.noolcode/skills/git-release/SKILL.md
.noolcode/tools/
.well-known/noolcode
{ type: "raw" \| "patch", content: string }
{file:path/to/file}
**/*.js
%USERPROFILE%/intelephense/license.txt
%USERPROFILE%\.cache\noolcode
%USERPROFILE%\.config\noolcode\noolcode.jsonc
%USERPROFILE%\.config\noolcode\plugins
%USERPROFILE%\.local\share\noolcode
%USERPROFILE%\.local\share\noolcode\log
<project-root>/.noolcode/themes/*.json
<providerId>/<modelId>
<your-project>/.noolcode/plugins/
~
~/...
~/.agents/skills/*/SKILL.md
~/.agents/skills/<name>/SKILL.md
~/.aws/credentials
~/.bashrc
~/.cache/noolcode
~/.cache/noolcode/node_modules/
~/.claude/CLAUDE.md
~/.claude/skills/
~/.claude/skills/*/SKILL.md
~/.claude/skills/<name>/SKILL.md
~/.config/noolcode
~/.config/noolcode/AGENTS.md
~/.config/noolcode/agents/
~/.config/noolcode/commands/
~/.config/noolcode/modes/
~/.config/noolcode/noolcode.json
~/.config/noolcode/noolcode.jsonc
~/.config/noolcode/plugins/
~/.config/noolcode/skills/*/SKILL.md
~/.config/noolcode/skills/<name>/SKILL.md
~/.config/noolcode/themes/*.json
~/.config/noolcode/tools/
~/.config/zed/settings.json
~/.local/share
~/.local/share/noolcode/
~/.local/share/noolcode/auth.json
~/.local/share/noolcode/log/
~/.local/share/noolcode/mcp-auth.json
~/.local/share/noolcode/noolcode.jsonc
~/.npmrc
~/.zshrc
~/code/
~/Library/Application Support
~/projects/*
~/projects/personal/
${config.github}/blob/dev/packages/sdk/js/src/gen/types.gen.ts
$HOME/intelephense/license.txt
$HOME/projects/*
$XDG_CONFIG_HOME/noolcode/themes/*.json
agent/
agents/
build/
commands/
dist/
http://<wsl-ip>:4096
http://127.0.0.1:8080/callback
http://localhost:<port>
http://localhost:4096
http://localhost:4096/doc
https://app.example.com
https://AZURE_COGNITIVE_SERVICES_RESOURCE_NAME.cognitiveservices.azure.com/
https://noolcode.ai/zen/v1/chat/completions
https://noolcode.ai/zen/v1/messages
https://noolcode.ai/zen/v1/models/gemini-3-flash
https://noolcode.ai/zen/v1/models/gemini-3-pro
https://noolcode.ai/zen/v1/responses
https://RESOURCE_NAME.openai.azure.com/
laravel/pint
log/
model: "anthropic/claude-sonnet-4-5"
modes/
node_modules/
openai/gpt-4.1
noolcode.ai/config.json
noolcode/<model-id>
noolcode/gpt-5.1-codex
noolcode/gpt-5.2-codex
noolcode/kimi-k2
openrouter/google/gemini-2.5-flash
opncd.ai/s/<share-id>
packages/*/AGENTS.md
plugins/
project/
provider_id/model_id
provider/model
provider/model-id
rm -rf ~/.cache/noolcode
skills/
skills/*/SKILL.md
src/**/*.ts
themes/
tools/
```

## Keybind strings

```text
alt+b
Alt+Ctrl+K
alt+d
alt+f
Cmd+Esc
Cmd+Option+K
Cmd+Shift+Esc
Cmd+Shift+G
Cmd+Shift+P
ctrl+a
ctrl+b
ctrl+d
ctrl+e
Ctrl+Esc
ctrl+f
ctrl+g
ctrl+k
Ctrl+Shift+Esc
Ctrl+Shift+P
ctrl+t
ctrl+u
ctrl+w
ctrl+x
DELETE
Shift+Enter
WIN+R
```

## Model ID strings referenced

```text
{env:OPENCODE_MODEL}
anthropic/claude-3-5-sonnet-20241022
anthropic/claude-haiku-4-20250514
anthropic/claude-haiku-4-5
anthropic/claude-sonnet-4-20250514
anthropic/claude-sonnet-4-5
gitlab/duo-chat-haiku-4-5
lmstudio/google/gemma-3n-e4b
openai/gpt-4.1
openai/gpt-5
noolcode/gpt-5.1-codex
noolcode/gpt-5.2-codex
noolcode/kimi-k2
openrouter/google/gemini-2.5-flash
```
