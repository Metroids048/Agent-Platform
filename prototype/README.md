# Agent Platform 原型（独立交付包）

**Agent Platform** 运营/开发双平台 HTML 原型 — **35** 个根目录页面 + **6** 页 Web 用户端，静态 HTML + `assets/proto.js`（sessionStorage 状态），**无后端 API**。

将本文件夹 zip 给他人即可本地预览全部页面与交互。

---

## 环境要求

| 必需 | 可选（推荐） |
|------|-------------|
| 现代浏览器（Chrome / Edge / Firefox） | Python 3 **或** Node.js（用于本地 HTTP 服务） |

---

## 快速启动（推荐）

### Windows

```powershell
cd prototype
.\start.ps1
```

浏览器打开：**http://127.0.0.1:8766/index.html**

### macOS / Linux

```bash
cd prototype
chmod +x start.sh
./start.sh
```

### 备选

```bash
cd prototype
python -m http.server 8766
# 或
npx --yes serve -p 8766
```

---

## 直接打开 HTML（不推荐）

可双击 `index.html`（`file://`），大部分交互可用。  
个别导航场景建议用 HTTP 启动。

---

## 主入口与核心路径

| 入口 | 说明 |
|------|------|
| [index.html](index.html) | **运营平台默认首页** — v1.1 智能体卡片列表 |
| [dashboard.html](dashboard.html) | 运营概览 / KPI |
| [audit-workbench.html](audit-workbench.html) | 审核工作台 |
| [agent-detail.html](agent-detail.html) | 运营视角智能体详情（卡片点进） |
| [05-agent-detail.html?id=agt_demo_001](05-agent-detail.html?id=agt_demo_001) | **配置视角** — Tab、Skills、发布（ADR-003 核心页） |
| [06-dev-editor.html](06-dev-editor.html) | 开发编排编辑器 |
| [10-skills-management.html](10-skills-management.html) | Skills 管理 |
| [web端/index.html](web端/index.html) | Web 用户端对话门户 |

完整页面索引见 [docs/PAGES.md](docs/PAGES.md)。流程说明见 [docs/agent-ops-flow.html](docs/agent-ops-flow.html)。

**建议体验路径：**

1. `index.html` → 点卡片 → `agent-detail.html` → 返回 index → 再进（验证运营导航）
2. `05-agent-detail.html?id=agt_demo_001` → Tab / Skills → 回 index → 再进 05（验证 ADR-003）

---

## 开发者验证（可选）

改动了 `assets/*.js` 后：

```bash
cd prototype
npm install jsdom --no-save   # 首次
npm run verify
```

含 9 步回归（含 navigation-journey + v11-ops）。详见 [DELIVERY-CHECKLIST.md](DELIVERY-CHECKLIST.md)。

打包前链接完整性：

```bash
npm run package-check
```

---

## 打包给他人

**包含：** 全部 `*.html`、`assets/`、`README.md`、`start.ps1`、`start.sh`、`package.json`、`docs/`  
**可不含：** `node_modules/`（接收方只看页面不需要）

接收方：解压 → 运行 `start.ps1` 或 `start.sh` → 打开 index（即 v1.1 卡片列表）。

---

## 仓库根目录说明

本文件夹为**可独立交付的原型包**。完整 AI 工程配置（AGENTS.md、rules、skills）在仓库根目录，**不影响**他人本地预览页面。
