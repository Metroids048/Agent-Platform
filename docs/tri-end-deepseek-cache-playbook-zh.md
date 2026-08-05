# DeepSeek + Claude Code 缓存命中率 Playbook

> 客户端入口保持 `ANTHROPIC_BASE_URL=http://127.0.0.1:15721`（CC Switch）。DeepSeek 流量经 CC Switch 上游 → `127.0.0.1:18789` 缓存对齐代理 → `api.deepseek.com`。

## 链路

```mermaid
flowchart LR
  CC[Claude Code] -->|15721| CCSwitch[CC Switch]
  CCSwitch -->|DeepSeek provider| Proxy[deepseek-cc-proxy :18789]
  Proxy --> DS[api.deepseek.com]
```

## 已配置项

| 项 | 作用 |
|----|------|
| `CLAUDE_CODE_ATTRIBUTION_HEADER=0` | 禁止每轮变化的 `cch` 破坏前缀 hash |
| `deepseek-cc-proxy.mjs` | 剥 billing header、tools 按 name 排序、去掉 cache_control |
| `cc-sync-all.ps1` | DeepSeek provider 上游写 `18789/anthropic`；客户端仍 `15721` |

## 安装 / 校验

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Desktop\Agent Platform\scripts\deepseek-cache\install-deepseek-cache-proxy.ps1" -Start
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Desktop\Agent Platform\scripts\global-workspace\apply-tri-end-env.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Desktop\Agent Platform\scripts\global-workspace\verify-deepseek-cache.ps1"
```

日志：`~/.claude/scripts/deepseek-cc-proxy.log`（含 `cache hit=` 行）

## 仍会导致 miss 的因素

1. **架构固有**：每轮 tool result 插入 messages，DeepSeek 全前缀匹配 → 常见 60–75%，非 90%+
2. **MCP 工具列表抖动**：工具排在 system 前；MCP 连接/排序变化从 byte 0 bust
3. **`/compact` / resume**：上下文结构变化
4. **DeepSeek 忽略 `cache_control`**：`ENABLE_PROMPT_CACHING_1H` 对 DeepSeek 无效

## 操作建议（零代码）

- Claude Code + DeepSeek 会话：**关闭非必要 MCP**（建议 0–2 个）
- 长任务用**单会话连续多轮**，少 `/clear` 重建前缀
- 勿在会话中频繁改 `settings.json` hooks/MCP
- 账单观察：`prompt_cache_hit_tokens` / `prompt_cache_miss_tokens`

## 进阶（按需）

- [Permafrost](https://github.com/jianzhichun/permafrost) — MCP 多时 tool 稳定化
- [claude-code-cache-fix](https://github.com/cnighswonger/claude-code-cache-fix) — resume/compact 导致 miss
