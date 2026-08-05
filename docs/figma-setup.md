# Figma MCP 三端打通说明（Starter 免费版）

本项目在 **Cursor、Codex、Claude Code** 三端保持 Figma 双向通道。仓库内不保存 Figma Token 或 OAuth 凭据。

## 策略摘要（Starter）

| 方向 | 主通道 | 备用 |
|------|--------|------|
| **Figma → 代码** | `FIGMA_API_KEY` + REST API 批量提取 | Frame 链接 + Remote MCP 读（≤6 次/月精修） |
| **代码 → Figma** | Remote MCP 写（`use_figma`、`generate_figma_design`，**免限额**） | Cursor Figma 插件 |

Desktop MCP `127.0.0.1:3845` 需付费 Dev Seat；Starter 账号 verify 时仅 **WARN**，不阻塞交付。

## 三层配置

| 层 | 路径 | 作用 |
|----|------|------|
| 管理员模板 | `scripts/global-workspace/templates/mcp/figma-mcp-canonical.json` | 三端 MCP 定义源 |
| 本机同步 | `scripts/sync-figma-mcp.ps1` | 合并到 `~/.cursor`、`~/.codex`、`~/.claude.json` |
| 项目路由 | `design/figma.config.json` → `mcp.agentRouting` | Agent 选用顺序 |

## 本机 MCP 位置

| 客户端 | 配置位置 | 条目 |
|--------|----------|------|
| Cursor | `~/.cursor/mcp.json` | `figma`、`figma-desktop` |
| Codex | `~/.codex/config.toml` + `codex-plus-mcp-overlay.toml` | `mcp_servers.figma`、`figma-desktop` |
| Claude Code | `~/.claude.json` → `mcpServers` | `figma`、`figma-desktop` |

Codex 全局 merge 脚本会保留 Figma MCP：

- `~/.ai-workspace/scripts/merge-codex-config.py`
- `~/.ai-workspace/scripts/repair-codex-plus-plugins-mcp.ps1`

## 一次性设置

### 1. 同步三端 MCP 配置

```powershell
powershell -ExecutionPolicy Bypass -File scripts/sync-figma-mcp.ps1
```

### 2. PAT（读设计主力）

1. Figma → Settings → Security → Personal access tokens
2. 权限：**File content: Read**
3. Windows 用户环境变量：

```powershell
[Environment]::SetEnvironmentVariable('FIGMA_API_KEY', 'figd_你的token', 'User')
```

重启终端 / IDE 后生效。

### 3. 三端 OAuth（各做一次）

| 客户端 | 步骤 |
|--------|------|
| **Cursor** | Settings → MCP → `figma` → Connect / Authorize |
| **Codex** | 重启后首次调用 figma MCP，或 `codex mcp login figma` |
| **Claude Code** | `claude mcp add --transport http figma https://mcp.figma.com/mcp --scope user`，然后 Allow access |

### 4. Desktop MCP（可选，付费 Dev Seat）

若升级 Pro + Dev Seat，可在 Figma Desktop 中：

1. 打开设计文件：`gDc0xlVkOeJdgrQOZMy3wh`
2. Dev Mode → 启用 MCP server
3. 地址：`http://127.0.0.1:3845/mcp`

## 验证命令

普通检查（Starter 可接受 3845 WARN）：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-figma-mcp.ps1
```

付费 Dev Seat 严格检查：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-figma-mcp.ps1 -StrictDesktop
```

检查项：项目 `figma.config.json`、Cursor/Codex/Claude MCP、`FIGMA_API_KEY`、canonical 模板、`resolve-figma-screen.js`。

## 每次任务流程

### Figma → 代码

1. `node scripts/resolve-figma-screen.js --key <screen>`
2. 批量数据 → PAT REST（见 `skills/figma2code` Phase 1）
3. 单帧精修 → Remote MCP `get_design_context`（控制 ≤6 次/月）
4. 改 `htmlMirror` + `style.css`；`node prototype/scripts/verify-all.js`

### 代码 → Figma

1. 读 **figma-use** + **figma-generate-design** skill
2. Cursor：`plugin-figma-figma`；Codex/Claude：`figma` Remote MCP
3. `use_figma` / `generate_figma_design`（写免限额）
4. 新 Frame 回写 `figma.config.json` → `screens.<key>.nodeId`

## 备选（超额时）

| 方案 | 说明 | 风险 |
|------|------|------|
| Rune | 开源读写 Figma | 第三方服务 |
| Flaude | Claude + Figma 插件写画布 | 需额外插件 |
| 升级 Pro + Dev Seat | Desktop 3845 + 更高读限额 | 付费 |

默认不写入主配置；Talk to Figma MCP（闭源）不推荐用于公司项目。
