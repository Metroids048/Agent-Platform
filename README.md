# Agent Platform

一个可在本地试用的 Agent 平台交互原型，覆盖运营、开发与用户对话三个视角。适合评审智能体从创建、配置、审核到上架的产品流程。仓库中的可运行展示入口位于 `prototype/`。

## 快速体验

在仓库根目录运行以下命令，然后打开 [http://127.0.0.1:8766/index.html](http://127.0.0.1:8766/index.html)。需要 Python 3 和现代浏览器。

```sh
python3 -m http.server 8766 --bind 127.0.0.1 --directory prototype
```

| 入口 | 可以看什么 |
| --- | --- |
| [运营首页](prototype/index.html) | 智能体列表、卡片和详情导航 |
| [审核工作台](prototype/audit-workbench.html) | 审核队列与工作台布局 |
| [智能体配置](prototype/05-agent-detail.html?id=agt_demo_001) | 配置项、Skills 与发布入口 |
| [开发编排](prototype/06-dev-editor.html) | Agent 开发编辑器 |
| [Web 对话门户](prototype/web端/index.html) | 用户端对话界面 |

页面和示例数据用于演示产品流程。启动原型无需 API 凭据。

## 开发与验证

原型的脚本、页面索引、启动方式以及 `npm run verify`、`npm run package-check` 的使用说明见 [prototype/README.md](prototype/README.md)。页面职责见 [页面索引](prototype/docs/PAGES.md)。

如需单独检查自有 **HCAI** 服务，在运行环境中设置 `HCAI_CHAT_URL`、`HCAI_API_KEY` 和 `HCAI_MODEL`，然后运行 `python3 _test_hcai.py`。该脚本会向配置的 HTTPS 聊天接口发起一次最小请求，只输出检查结果。

对于 Anthropic Messages 兼容服务，设置 `HCAI_MESSAGES_URL` 为完整的 HTTPS 地址，配合 `HCAI_API_KEY` 和 `HCAI_MODEL` 运行 `python3 _test_hcai_paths.py`。脚本只检查指定的接口。
