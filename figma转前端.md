# Figma → 前端代码 完整技术方案

  

> **文档版本**：v2.0（2026-06-03）  

> **适用范围**：本项目 Agent Platform，静态 HTML + 原生 JS 原型，无构建步骤  

> **文档用途**：任何人拿到 Figma 链接后，按本文档能独立完成从读取设计稿到交付可运行前端代码的全部工作

  

---

  

## 目录

  

1. [工具栈与前置条件](#1-工具栈与前置条件)

2. [Figma 数据模型](#2-figma-数据模型)

3. [完整提取 Figma 数据](#3-完整提取-figma-数据)

4. [数据解析与分析](#4-数据解析与分析)

5. [交互设计重建](#5-交互设计重建)

6. [代码生成完整流程](#6-代码生成完整流程)

7. [HTML/CSS 映射规则](#7-htmlcss-映射规则)

8. [嵌入现有项目规范](#8-嵌入现有项目规范)

9. [验收标准与流程](#9-验收标准与流程)

10. [问题排查手册](#10-问题排查手册)

11. [本项目实际数据（附录）](#11-本项目实际数据附录)

  

---

  

## 1. 工具栈与前置条件

  

### 1.1 必需工具

  

| 工具 | 版本要求 | 用途 | 检查命令 |

|------|---------|------|---------|

| Node.js | ≥ 18 | 数据分析脚本 | `node --version` |

| Python | ≥ 3.8 | 本地预览服务 | `python --version` |

| PowerShell | 5.1（Windows 内置） | 调用 Figma API | `$PSVersionTable.PSVersion` |

| 浏览器 | Chrome / Edge | 视觉对比 | — |

| Figma Desktop | 最新版（可选） | Desktop MCP | figma.com/downloads |

  

### 1.2 Figma 访问权限

  

**获取 Personal Access Token (PAT)**：

1. 登录 Figma → 右上角头像 → Settings

2. 左侧 Security → Personal access tokens → Generate new token

3. 勾选需要的权限：**File content: Read** 即可（不需要写权限）

4. 复制 token，格式为 `figd_XXXXXXXXXXXXXXXX`

  

**Token 有效期**：PAT 默认不过期，但建议每 90 天轮换一次。

  

**获取 File Key**：

Figma URL 格式为 `https://www.figma.com/design/<FILE_KEY>/文件名`

从 URL 中提取 `FILE_KEY`，例如 URL 为

`https://www.figma.com/design/gDc0xlVkOeJdgrQOZMy3wh/智能体开发平台`，

则 `fileKey = "gDc0xlVkOeJdgrQOZMy3wh"`

  

### 1.3 Figma MCP 配置（两种方式）

  

**方式 A：云端 MCP（有速率限制）**

  

```json

// ~/.cursor/mcp.json

{

  "mcpServers": {

    "figma": {

      "url": "https://mcp.figma.com/mcp"

    }

  }

}

```

  

首次使用需在 Cursor Settings → MCP → figma → 完成 OAuth 授权。

Starter 账号约每月 6 次读操作，**超出后 API 返回 429**。

  

**方式 B：Figma Desktop 本地 MCP（无限制，推荐）**

  

1. Figma Desktop → Preferences → Enable Dev Mode

2. Dev Mode 设置中启用 "MCP Server"

3. 默认端口 3845，MCP URL 为 `http://127.0.0.1:3845/mcp`

  

```json

// ~/.cursor/mcp.json

{

  "mcpServers": {

    "figma-desktop": {

      "url": "http://127.0.0.1:3845/mcp"

    }

  }

}

```

  

本地 MCP 需要 Figma Desktop 保持运行，且 Figma 文件在 Desktop 中已打开。

  

### 1.4 项目目录准备

  

```

agent-platform/

  design/

    figma.config.json          ← Figma 文件配置（fileKey 等）

    figma-extract/             ← API 提取的原始 JSON（自动生成）

      frames/                  ← 按帧切分的单帧 JSON（自动生成）

    scripts/                   ← 分析脚本

      analyze-frames.js

      extract-frame.js

      deep-frame-analysis.js

    figma-frame-list.json      ← Frame 清单（分析产出）

    figma-frame-details.json   ← 每帧详情（分析产出）

    figma-gap-report.json      ← Gap 报告（分析产出）

    figma-nav-map.json         ← 模块导航图（分析产出）

    interaction-spec.json      ← 手工定义的交互规格（手动维护）

  prototype/

    assets/

      style.css                ← 全局设计系统（禁止新建 CSS 文件）

      proto.js                 ← 导航+状态核心（所有页面必须引入）

      ops-*.js                 ← 各业务模块 JS

    scripts/

      verify-all.js            ← 验收门禁（每批次必须全 PASS）

      package-check.js         ← 页面完整性检查

    *.html                     ← 各页面文件

```

  

---

  

## 2. Figma 数据模型

  

理解 Figma 的数据结构是正确提取数据的前提。

  

### 2.1 层级结构

  

```

File

├── document

│   ├── Page 1（如"运营平台"）

│   │   ├── Frame A（一个完整屏幕状态）

│   │   │   ├── 子节点（Group / Frame / Text / Rectangle / Instance / Vector）

│   │   │   └── interactions: []  ← 原型跳转（可能为空）

│   │   ├── Frame B（另一屏 / 弹窗 / 抽屉）

│   │   └── ...（顶层节点也可能是 TEXT / RECTANGLE 等注释节点）

│   ├── Page 2

│   └── Page 3

├── components         ← 组件主版本（key → componentId）

├── componentSets      ← 组件变体集

└── styles             ← 颜色/字体/效果样式

```

  

### 2.2 节点类型速查

  

| 类型 | 含义 | HTML 对应 |

|------|------|----------|

| FRAME | 容器/屏幕/弹窗（有裁切） | `<div>`（可能是 flex/absolute 布局） |

| GROUP | 不裁切的分组 | `<div>` wrapper |

| COMPONENT | 组件主版本 | 对应 HTML 组件模板 |

| INSTANCE | 组件实例（引用主版本） | 复用 HTML 组件 |

| TEXT | 文本节点 | `<p>` / `<span>` / `<h1>~<h6>` |

| RECTANGLE | 矩形（图片/色块/边框） | `<div>` with background / `<img>` |

| ELLIPSE | 椭圆 | CSS `border-radius:50%` |

| VECTOR | 矢量路径 | `<svg>` |

| SECTION | 逻辑分区（不渲染） | 忽略，遍历其 children |

| BOOLEAN_OPERATION | 布尔运算形状 | `<svg>` |

  

### 2.3 交互数据结构

  

Figma 节点的原型交互存储在 `interactions` 数组（旧版用 `reactions`）：

  

```json

{

  "interactions": [

    {

      "trigger": {

        "type": "ON_CLICK"   // ON_CLICK / ON_HOVER / AFTER_TIMEOUT / MOUSE_ENTER / MOUSE_LEAVE / KEY_DOWN

      },

      "actions": [

        {

          "type": "NODE",

          "destinationId": "243:360",  // 目标 Frame 的 nodeId

          "navigation": "NAVIGATE",    // NAVIGATE / OVERLAY / SCROLL_TO / BACK / CLOSE / SWAP

          "transition": {

            "type": "PUSH",            // PUSH / MOVE_IN / MOVE_OUT / SLIDE_IN / SLIDE_OUT / DISSOLVE / INSTANT

            "duration": 0.3,

            "direction": "LEFT"        // LEFT / RIGHT / TOP / BOTTOM

          },

          "preserveScrollPosition": false

        }

      ]

    }

  ]

}

```

  

> **本项目实际情况**：运营平台 Page 的所有帧 `interactions` 均为空数组，说明设计师未配置原型跳转。需要通过 [第5章](#5-交互设计重建) 手工重建交互规格。

  

---

  

## 3. 完整提取 Figma 数据

  

### 3.1 API 接口全览

  

所有接口的 Base URL：`https://api.figma.com/v1`  

认证：HTTP Header `X-Figma-Token: <your-token>`

  

| 接口 | 用途 | 关键参数 |

|------|------|---------|

| `GET /files/:key` | 完整文件树 | `depth=N`（层级深度）`geometry=paths`（含路径+交互） |

| `GET /files/:key/nodes` | 指定节点详情 | `ids=node1,node2`（逗号分隔）`geometry=paths` |

| `GET /files/:key/components` | 组件主版本清单 | — |

| `GET /files/:key/component_sets` | 组件变体集 | — |

| `GET /files/:key/styles` | 样式（颜色/字体/效果）清单 | — |

| `GET /files/:key/variables/local` | 设计变量（Token） | — |

| `GET /images/:key` | 导出节点为图片 | `ids=...` `format=svg/png/jpg/pdf` `scale=N` |

| `GET /files/:key/versions` | 文件版本历史 | — |

  

**关于 `depth` 参数**：

- `depth=1`：只返回 Pages

- `depth=2`：返回 Pages + 顶层 Frames 名称

- `depth=3`：返回 Pages + Frames + 一级子节点（推荐用于Frame清单）

- 不传 depth：返回完整树（文件很大时容易超时）

  

**关于 `geometry=paths`**：

在 `/files/:key` 或 `/files/:key/nodes` 中附加此参数，节点会额外包含：

- `fillGeometry`：填充路径

- `strokeGeometry`：描边路径

- `interactions`：原型交互（空或有值）

- `absoluteBoundingBox`：绝对坐标和尺寸

  

### 3.2 完整提取脚本

  

```powershell

# design/scripts/extract-figma-data.ps1

# 用法：在项目根目录运行

# .\design\scripts\extract-figma-data.ps1

  

param(

  [string]$Token  = "<YOUR_FIGMA_PAT>",

  [string]$FileKey = "gDc0xlVkOeJdgrQOZMy3wh",

  [string]$OutDir  = "design\figma-extract"

)

  

$header  = @{ "X-Figma-Token" = $Token }

$baseUrl = "https://api.figma.com/v1"

  

function Fetch-And-Save {

  param([string]$Url, [string]$OutFile, [string]$Label, [int]$MaxRetry = 3)

  $outPath = Join-Path $OutDir $OutFile

  $retries = 0

  while ($retries -lt $MaxRetry) {

    try {

      Write-Host "[$Label] 正在请求..." -ForegroundColor Cyan

      $data = Invoke-RestMethod $Url -Headers $header -TimeoutSec 120

      # 用 UTF-8 无 BOM 写入（Node.js 友好）

      $json = $data | ConvertTo-Json -Depth 20

      [System.IO.File]::WriteAllText((Resolve-Path $outPath -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Path -ErrorAction SilentlyContinue) ?? (Join-Path (Get-Location) $outPath), $json, [System.Text.Encoding]::UTF8)

      $size = (Get-Item $outPath).Length / 1MB

      Write-Host "[$Label] 完成 → $OutFile ($([math]::Round($size,1)) MB)" -ForegroundColor Green

      return $true

    } catch {

      $retries++

      $status = $_.Exception.Response.StatusCode.value__

      if ($status -eq 429) {

        Write-Host "[$Label] 速率限制（429），等待 60s 后重试 ($retries/$MaxRetry)..." -ForegroundColor Yellow

        Start-Sleep 60

      } elseif ($status -eq 403) {

        Write-Host "[$Label] 权限不足（403），检查 Token 是否有效" -ForegroundColor Red

        return $false

      } else {

        Write-Host "[$Label] 请求失败：$_，重试 ($retries/$MaxRetry)..." -ForegroundColor Yellow

        Start-Sleep 10

      }

    }

  }

  Write-Host "[$Label] 失败，已放弃" -ForegroundColor Red

  return $false

}

  

# 准备目录

New-Item -ItemType Directory -Force $OutDir | Out-Null

New-Item -ItemType Directory -Force "$OutDir\frames" | Out-Null

  

Write-Host "`n=== Step 1/5: 文件树（depth=3，含 Frame 名称）===" -ForegroundColor Magenta

Fetch-And-Save "$baseUrl/files/$FileKey`?depth=3" "01-file-tree.json" "文件树"

  

Write-Host "`n=== Step 2/5: 完整节点（geometry=paths，含交互数据）===" -ForegroundColor Magenta

Write-Host "注意：此请求文件可能超过 100MB，耗时较长" -ForegroundColor Yellow

# 建议按 Page 分批：先获取 pageId，再按 page 提取

# 如果文件过大，可跳过此步，改用 Step 2b 按页提取

Fetch-And-Save "$baseUrl/files/$FileKey`?geometry=paths" "02-full-with-interactions.json" "完整交互"

  

Write-Host "`n=== Step 3/5: 组件库 ===" -ForegroundColor Magenta

Fetch-And-Save "$baseUrl/files/$FileKey/components" "03-components.json" "组件库"

  

Write-Host "`n=== Step 4/5: 样式库 ===" -ForegroundColor Magenta

Fetch-And-Save "$baseUrl/files/$FileKey/styles" "04-styles.json" "样式库"

  

Write-Host "`n=== Step 5/5: 设计变量（Token）===" -ForegroundColor Magenta

Fetch-And-Save "$baseUrl/files/$FileKey/variables/local" "05-variables.json" "变量"

  

Write-Host "`n=== 提取完成，文件清单 ===" -ForegroundColor Magenta

Get-ChildItem $OutDir -File | Select-Object Name, @{N='Size(MB)';E={[math]::Round($_.Length/1MB,2)}}

```

  

**按 Page 分批提取**（文件过大时的替代方案）：

  

```powershell

# Step 2b：按单个 Page 提取（替代 Step 2 的整文件提取）

# 先从 01-file-tree.json 获取各 page 的 nodeId，再逐页提取

  

# 示例：只提取运营平台 Page（nodeId=241:250）

$pageId  = "241:250"

$encoded = [Uri]::EscapeDataString($pageId)

Fetch-And-Save "$baseUrl/files/$FileKey/nodes?ids=$encoded&geometry=paths" "06-page-ops-platform.json" "运营平台Page"

```

  

### 3.3 图片与图标资产导出

  

帧内的图片填充（fills type=IMAGE）和矢量图标需要单独导出：

  

**Step 1：找出所有图片节点 ID**

  

```javascript

// design/scripts/find-image-nodes.js

const fs = require('fs');

const raw = fs.readFileSync('design/figma-extract/01-file-tree.json', 'utf8');

const tree = JSON.parse(raw);

const imageNodeIds = [];

  

function walk(node) {

  if (!node) return;

  // 检查 fill 类型为 IMAGE

  (node.fills || []).forEach(f => {

    if (f.type === 'IMAGE') imageNodeIds.push(node.id);

  });

  (node.children || []).forEach(walk);

}

tree.document.children.forEach(page => page.children.forEach(walk));

  

// 输出供 PowerShell 使用

console.log(imageNodeIds.join(','));

```

  

**Step 2：批量导出**

  

```powershell

# 每次最多传 100 个 ID（API 限制）

$ids = "node1,node2,node3,..."

$svgResp = Invoke-RestMethod "https://api.figma.com/v1/images/$FileKey`?ids=$ids&format=svg" -Headers $header

  

# 下载每个 SVG

$svgResp.images.PSObject.Properties | ForEach-Object {

  $nodeId = $_.Name.Replace(':', '-')

  $url    = $_.Value

  if ($url) {

    Invoke-WebRequest $url -OutFile "prototype/assets/icons/$nodeId.svg"

  }

}

```

  

### 3.4 速率限制处理

  

Figma REST API 的限制规则（2025 年）：

  

| 账号类型 | 限制 |

|---------|------|

| Free/Starter | 读请求约 60次/分钟 |

| Professional | 更高，具体见官方文档 |

| Enterprise | 更高或无限 |

  

**429 错误处理策略**：

1. 收到 429 → 等待 `Retry-After` 响应头指定的秒数（通常 30~60s）

2. 没有 `Retry-After` → 等待 60s 再重试

3. 连续 3 次 429 → 停止当前会话，次日重试

4. 已提取的文件不重复请求（检查文件是否已存在）

  

---

  

## 4. 数据解析与分析

  

### 4.1 Frame 清单提取

  

```javascript

// design/scripts/analyze-frames.js

// 从文件树 JSON 提取完整 Frame 清单

// 输出：design/figma-frame-list.json

  

const fs   = require('fs');

const path = require('path');

  

function stripBOM(t) { return t.charCodeAt(0) === 0xFEFF ? t.slice(1) : t; }

  

const treeRaw = fs.readFileSync('design/figma-extract/01-file-tree.json', 'utf8');

const tree    = JSON.parse(stripBOM(treeRaw));

  

const frameList = [];

  

for (const page of tree.document.children) {

  for (const node of (page.children || [])) {

    if (!['FRAME','COMPONENT','GROUP','SECTION'].includes(node.type)) continue;

    const bb = node.absoluteBoundingBox || {};

    frameList.push({

      pageId:    page.id,

      pageName:  page.name,

      frameId:   node.id,

      frameName: node.name,

      type:      node.type,

      width:     Math.round(bb.width  || 0),

      height:    Math.round(bb.height || 0),

      childCount: (node.children || []).length,

    });

  }

}

  

fs.writeFileSync(

  'design/figma-frame-list.json',

  JSON.stringify(frameList, null, 2),

  'utf8'

);

  

console.log(`提取完成：${frameList.length} 个 Frame`);

frameList.forEach((f, i) =>

  console.log(`  ${i+1}. [${f.pageName}] "${f.frameName}" id=${f.frameId} ${f.width}×${f.height}`)

);

```

  

### 4.2 Frame 分类规则

  

每个 Frame 需要归类为以下五种类型之一，以确定 HTML 实现方式：

  

| 类型 | 判断规则 | HTML 实现 |

|------|---------|----------|

| **fullpage** | 宽 ≥ 1200px，高 ≥ 800px | 独立 `.html` 文件，含 topbar + sidebar + main |

| **modal** | 宽 < 1000px，高 < 700px；或 Frame 名包含"弹窗/确认/删除/申请/处理" | `.modal-overlay` + `<dialog>` 内嵌在父页面中 |

| **drawer** | 宽 ≤ 700px，高 ≥ 800px；或 Frame 名包含"侧边/消息/通知/抽屉" | 右侧或左侧滑入的 `.drawer-overlay` |

| **tab-content** | 同模块有多个名称相似的 Frame（如"列表-默认""列表-筛选中""列表-选中态"） | 同一 HTML 页内的 Tab 切换，不跳页 |

| **tooltip/menu** | 宽 < 300px，高 < 300px；或名称含"操作/菜单/悬停" | CSS/JS 浮层，绑定到触发元素 |

  

```javascript

// 分类函数（在 analyze-frames.js 中调用）

function classifyFrame(frame) {

  const { frameName, width, height } = frame;

  const isModal =

    (width < 1000 && height < 700) ||

    /弹窗|确认|删除|申请|处理反馈|退回|提示|Alert/.test(frameName);

  const isDrawer =

    (width <= 700 && height >= 800) ||

    /消息中心|抽屉|侧滑|Drawer/.test(frameName);

  const isMenu =

    (width < 300 && height < 300) ||

    /操作|菜单|下拉|悬停|Tooltip|ContextMenu/.test(frameName);

  if (isMenu)   return 'tooltip/menu';

  if (isModal)  return 'modal';

  if (isDrawer) return 'drawer';

  return 'fullpage';

}

```

  

### 4.3 Gap 分析（现有 HTML vs 需要新建）

  

```javascript

// design/scripts/gap-analysis.js

// 对比 Frame 清单和已有 HTML 文件，输出 Gap 报告

  

const EXISTING_HTML = {

  'index.html':                ['运营列表', '智能体运营', '运营管理列表'],

  '04-create-modal.html':      ['创建', '新建智能体'],

  '05-agent-detail.html':      ['智能体详情', '运营详情', '智能体运营-详情'],

  '06-dev-platform.html':      ['开发平台', '我的智能体'],

  '06-dev-editor.html':        ['编辑器', '开发编辑'],

  '06-dev-resources.html':     ['资源管理', '工具', '知识库'],

  '07-pick-resource.html':     ['资源选择', 'pick'],

  '08-audit-queue.html':       ['审核工作台', '审核队列'],

  '08-audit-review.html':      ['审核详情', '审核处理'],

  '08-audit-status.html':      ['审核进度', '审核状态'],

  '09-user-chat.html':         ['用户对话', '用户聊天'],

  '10-skills-management.html': ['skills', '技能管理'],

  'third-party-register.html': ['第三方接入', '第三方注册'],

};

  

const frameList = JSON.parse(fs.readFileSync('design/figma-frame-list.json', 'utf8'));

const report    = { covered: [], missing: [] };

  

for (const frame of frameList) {

  const lower = frame.frameName.toLowerCase();

  let matchedFile = null;

  for (const [file, keywords] of Object.entries(EXISTING_HTML)) {

    if (keywords.some(kw => lower.includes(kw.toLowerCase()))) {

      matchedFile = file; break;

    }

  }

  const type = classifyFrame(frame);

  if (matchedFile) {

    report.covered.push({ ...frame, type, matchedHtml: matchedFile });

  } else {

    report.missing.push({ ...frame, type, suggestedHtml: suggestFilename(frame) });

  }

}

  

// 建议文件名（根据模块分组）

function suggestFilename(frame) {

  if (/专家工作台|专家社区|专家操作/.test(frame.frameName)) return '12-expert-workbench.html';

  if (/用户反馈|处理反馈/.test(frame.frameName)) return '11-user-feedback.html';

  if (/分派任务/.test(frame.frameName)) return '11-user-feedback-detail.html'; // 弹窗

  if (/权限|开发者管理|组织架构/.test(frame.frameName)) return '13-permission-mgmt.html';

  if (/消息中心|公告|待办/.test(frame.frameName)) return 'topbar-message-drawer'; // 全局浮层

  return 'TBD';

}

```

  

### 4.4 逐帧详情提取

  

把 112MB 大文件按帧 ID 切分为小文件，供转换时使用：

  

```javascript

// design/scripts/extract-frame.js

// 用法：node design/scripts/extract-frame.js "243:272"

  

const fs     = require('fs');

const path   = require('path');

const frameId = process.argv[2];

if (!frameId) { console.error('用法：node extract-frame.js "<frameId>"'); process.exit(1); }

  

function stripBOM(t) { return t.charCodeAt(0) === 0xFEFF ? t.slice(1) : t; }

  

// 定位数据源：优先用 06-page-*.json（按页提取的），否则用大文件

const candidates = [

  'design/figma-extract/06-page-ops-platform.json',

  'design/figma-extract/02-full-with-interactions.json',

];

let nodesData = null;

for (const f of candidates) {

  if (fs.existsSync(f)) {

    console.log(`加载: ${f}...`);

    nodesData = JSON.parse(stripBOM(fs.readFileSync(f, 'utf8')));

    break;

  }

}

if (!nodesData) { console.error('找不到节点数据文件'); process.exit(1); }

  

// 找到目标帧

let targetFrame = null;

const nodesRoot = nodesData.nodes || {};

for (const pageKey of Object.keys(nodesRoot)) {

  const page = nodesRoot[pageKey].document;

  if (!page) continue;

  targetFrame = (page.children || []).find(f => f.id === frameId);

  if (targetFrame) break;

}

if (!targetFrame) { console.error(`未找到帧 ID: ${frameId}`); process.exit(1); }

  

// 保存单帧 JSON

const outDir  = 'design/figma-extract/frames';

const outFile = path.join(outDir, `${frameId.replace(':', '-')}.json`);

fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(outFile, JSON.stringify(targetFrame, null, 2), 'utf8');

  

const size = (JSON.stringify(targetFrame).length / 1024).toFixed(0);

console.log(`✅ 提取完成：${outFile} (${size} KB)`);

console.log(`   帧名称：${targetFrame.name}`);

console.log(`   尺寸：${(targetFrame.absoluteBoundingBox||{}).width}×${(targetFrame.absoluteBoundingBox||{}).height}`);

console.log(`   子节点：${(targetFrame.children||[]).length}`);

```

  

---

  

## 5. 交互设计重建

  

### 5.1 为什么需要手工重建

  

当 Figma 文件的 `interactions[]` 全为空时（设计师未配置原型跳转，只交付了视觉稿），需要手工推断交互规格。推断依据：

  

1. **Frame 命名规律**：Frame 名称通常包含模块、子视图、状态信息

2. **帧内文本内容**：按钮文字、标签文字揭示操作语义

3. **Frame 尺寸和类型**：大帧=全页，小帧=弹窗/覆层

4. **PRD 文档**：产品需求文档中的流程描述

5. **UX 通用模式**：列表→详情、表单→提交→确认、Tab 切换等标准模式

  

### 5.2 Frame 命名规律 → 交互类型推断

  

本项目 Frame 命名遵循 `模块-子视图[-状态/角色]` 格式，从中可以推断：

  

| 命名规律示例 | 推断的交互 |

|-----------|----------|

| `A` → `A-B` | A 页面点击某行/某按钮 → 进入 B（NAVIGATE） |

| `A-B` → `A-B-做任务` | B 中点击操作按钮 → 进入下一状态（NAVIGATE） |

| `A-指定X` / `A-处理X` | A 页面触发动作 → 打开覆层（OVERLAY） |

| 同前缀多帧（如`列表-默认`/`列表-筛选中`） | 同页 Tab 或 Filter 切换（tab-switch） |

| `（角色）弹窗名称` | 同一弹窗的不同角色状态（同一 modal，条件渲染） |

| `操作` / `查看` / `编辑` 等小尺寸帧 | 右键菜单 / 操作下拉（tooltip/menu） |

  

### 5.3 interaction-spec.json 规范

  

手工定义的交互规格，转换阶段的唯一依据：

  

```json

// design/interaction-spec.json

{

  "$version": "1.0",

  "$description": "手工定义的导航交互规格，基于 Frame 命名分析 + PRD",

  "modules": {

    "user-feedback": {

      "description": "用户反馈管理，列表→详情→处理弹窗",

      "htmlEntry": "11-user-feedback.html",

      "flows": [

        {

          "id": "UF-01",

          "from": { "file": "11-user-feedback.html", "element": "表格行" },

          "trigger": "click",

          "to": { "file": "11-user-feedback-detail.html", "params": ["feedbackId"] },

          "navType": "navigate",

          "htmlImpl": "<a href=\"11-user-feedback-detail.html?id=${feedbackId}\">查看</a>",

          "figmaFrameRef": "243:6859"

        },

        {

          "id": "UF-02",

          "from": { "file": "11-user-feedback-detail.html", "element": "处理按钮" },

          "trigger": "click",

          "to": { "modalId": "feedbackProcessModal" },

          "navType": "overlay",

          "htmlImpl": "document.getElementById('feedbackProcessModal').classList.remove('hidden')",

          "figmaFrameRef": "243:7175",

          "variants": ["个人角色:243:7114", "团队负责人:243:7143", "运营:243:7175"]

        },

        {

          "id": "UF-03",

          "from": { "file": "11-user-feedback-detail.html", "element": "分派按钮" },

          "trigger": "click",

          "to": { "modalId": "taskDispatchModal" },

          "navType": "overlay",

          "htmlImpl": "打开分派任务弹窗，两种模式：指定团队/指定专家",

          "figmaFrameRef": "243:1770"

        }

      ]

    },

    "expert-workbench": {

      "description": "专家工作台，我的任务→做任务→上下文",

      "htmlEntry": "12-expert-workbench.html",

      "flows": [

        {

          "id": "EW-01",

          "from": { "file": "12-expert-workbench.html", "element": "任务行", "tab": "my-tasks" },

          "trigger": "click",

          "to": { "sameFile": true, "action": "tab-switch", "targetTab": "in-progress", "params": ["taskId"] },

          "navType": "tab-switch",

          "htmlImpl": "切换 data-tab 展示进行中面板，传递 taskId"

        },

        {

          "id": "EW-02",

          "from": { "file": "12-expert-workbench.html", "element": "【做任务】按钮", "tab": "in-progress" },

          "trigger": "click",

          "to": { "file": "12-expert-task-detail.html", "params": ["taskId"] },

          "navType": "navigate"

        }

      ]

    },

    "permission-mgmt": { "flows": [] },

    "message-center":  { "flows": [] },

    "task-dispatch":   { "flows": [] },

    "ops-review-expert": { "flows": [] }

  }

}

```

  

**编写 interaction-spec.json 的工作流**：

  

1. 打开 `design/figma-frame-details.json`，逐模块浏览帧的文本样本和尺寸

2. 在 Figma 里打开对应帧，观察按钮、链接、操作

3. 对照 `运营平台-智能体运营.md` PRD，确认业务流程

4. 按上述 JSON 格式补充 flows 数组

  

---

  

## 6. 代码生成完整流程

  

### 6.1 方式选择

  

根据当前 Figma MCP 可用状态选择：

  

```

检查 Figma Desktop MCP 是否可用？

  ├─ 是（Desktop 运行中，3845 端口响应）→ 方式 1（精度最高）

  └─ 否

     ├─ REST API JSON 已提取 → 方式 2（精度高）

     └─ 都不可用 → 方式 3（截图兜底）

```

  

### 6.2 方式 1：Figma Desktop MCP（推荐）

  

**前提**：Figma Desktop 已打开目标文件，Dev Mode MCP 已启用

  

**工作流**：

  

```

Step 1  在 Figma Desktop 选中目标 Frame

Step 2  Claude Code 调用 MCP 工具获取设计上下文：

        → 工具返回：节点树、自动布局参数、颜色值、字体规格、组件实例名

Step 3  结合 interaction-spec.json 中该帧的交互规格

Step 4  给 Claude Code 的指令模板（见下方）

Step 5  Claude 生成 HTML 草稿

Step 6  本地预览 + 视觉对比修正

```

  

**给 Claude Code 的标准指令模板**（每帧转换时使用）：

  

```

请按以下信息，为 [模块名称] 生成 [frameName] 对应的 HTML 页面。

  

【设计上下文】

[粘贴 MCP 返回的设计数据]

  

【交互规格】

[粘贴 interaction-spec.json 中该帧的 flows 数组]

  

【约束】

1. 只使用 prototype/assets/style.css 中已有的 CSS 类，禁止内联 style 和新建 CSS 文件

2. 引入 proto.js，调用 Proto.initTopbar('ops') 初始化导航

3. 所有内部链接用 Proto.href() 生成

4. 弹窗使用 .modal-overlay.hidden 模式，参考 04-create-modal.html

5. 页面骨架参考 index.html（topbar + sidebar + main 三层结构）

  

【参考文件】

- 侧边栏模式：index.html

- 审核工作台模式：08-audit-queue.html

- 弹窗模式：04-create-modal.html

- 详情页模式：05-agent-detail.html

```

  

### 6.3 方式 2：REST API JSON + Claude（无 MCP 时）

  

**工作流**：

  

```

Step 1  提取单帧 JSON

        node design/scripts/extract-frame.js "243:272"

        → 生成 design/figma-extract/frames/243-272.json

  

Step 2  Claude Code 读取单帧 JSON，分析：

        - 顶层布局（layoutMode, padding, gap）

        - 子节点层次（哪些是内容区、哪些是操作区）

        - TEXT 节点文字（确定 label、title、placeholder）

        - INSTANCE 节点（确定使用了哪些组件，对应 HTML 的哪个 class）

  

Step 3  结合 interaction-spec.json，生成 HTML

Step 4  本地预览 + 视觉对比修正

```

  

**Claude 分析单帧 JSON 的提示**：

  

```

请读取以下 Figma 帧的节点 JSON（243:272），分析其布局结构，然后生成对应的 HTML。

  

节点 JSON 见附件（或粘贴内容）

  

分析步骤：

1. 识别顶层布局（AutoLayout 横/纵/绝对定位）

2. 提取所有 TEXT 节点内容，确定标签和文案

3. 识别 INSTANCE 节点名称，映射到已有 HTML 组件（如 Button → .btn，Tag → .tag-*）

4. 提取颜色值，映射到 style.css 变量（#003da6 → --primary）

5. 生成 HTML，遵循项目约束（见方式1中的约束列表）

```

  

### 6.4 方式 3：截图 + Claude Vision（兜底）

  

**工作流**：

  

```

Step 1  在 Figma 中截图目标 Frame（Export → PNG @2x）

Step 2  把截图提供给 Claude Code（附件或粘贴）

Step 3  Claude 分析截图，生成 HTML

Step 4  必须进行更仔细的视觉对比修正（精度最低）

```

  

**注意事项**：

- 截图方式的颜色精度不如 API（颜色值需要再从 JSON 核对）

- 字体大小可能有偏差（截图无法直接读取 px 值）

- 适合快速起草，但必须结合 JSON 或 MCP 数据做精细校准

  

---

  

## 7. HTML/CSS 映射规则

  

### 7.1 布局映射（AutoLayout → Flexbox）

  

| Figma 属性 | CSS 属性 |

|-----------|---------|

| `layoutMode: "HORIZONTAL"` | `display:flex; flex-direction:row` |

| `layoutMode: "VERTICAL"` | `display:flex; flex-direction:column` |

| `layoutMode: "NONE"`（绝对定位） | `position:relative`（容器）+ 子级 `position:absolute` |

| `primaryAxisAlignItems: "MIN"` | `justify-content:flex-start` |

| `primaryAxisAlignItems: "CENTER"` | `justify-content:center` |

| `primaryAxisAlignItems: "MAX"` | `justify-content:flex-end` |

| `primaryAxisAlignItems: "SPACE_BETWEEN"` | `justify-content:space-between` |

| `counterAxisAlignItems: "MIN"` | `align-items:flex-start` |

| `counterAxisAlignItems: "CENTER"` | `align-items:center` |

| `counterAxisAlignItems: "MAX"` | `align-items:flex-end` |

| `counterAxisAlignItems: "BASELINE"` | `align-items:baseline` |

| `itemSpacing: N` | `gap:Npx` |

| `paddingLeft/Right/Top/Bottom: N` | `padding:TopPx RightPx BottomPx LeftPx` |

| `layoutWrap: "WRAP"` | `flex-wrap:wrap` |

| `clipsContent: true` | `overflow:hidden` |

| `layoutSizingHorizontal: "FILL"` | `flex:1` 或 `width:100%` |

| `layoutSizingHorizontal: "FIXED"` | `width:Npx` |

| `layoutSizingHorizontal: "HUG"` | 不设 width（由内容撑开） |

  

**绝对定位坐标转换**（父为 `position:relative` 时）：

```

子节点的 relativeTransform[0][2] → left: Npx

子节点的 relativeTransform[1][2] → top: Npx

子节点的 size.x → width: Npx

子节点的 size.y → height: Npx

```

  

### 7.2 视觉属性映射

  

**填充（背景色）**：

```javascript

// fills[0].type === 'SOLID'

const {r, g, b, a} = fill.color;

// → background-color: rgba(Math.round(r*255), Math.round(g*255), Math.round(b*255), a)

// 若 a === 1 → background-color: rgb(...) 即可

  

// fills[0].type === 'GRADIENT_LINEAR'

// → background: linear-gradient(angle, stop1 pos, stop2 pos, ...)

// gradientHandlePositions 计算角度（复杂，建议用 CSS 近似实现）

```

  

**文字颜色**（TEXT 节点的 fills）：同上，用 `color:` 而非 `background-color:`

  

**描边**：

```javascript

const stroke = node.strokes[0]; // SOLID

// → border: strokeWeight px solid rgba(r,g,b,a)

// strokeAlign: INSIDE → box-shadow: inset 0 0 0 strokeWeight rgba(...)

```

  

**圆角**：

```javascript

// cornerRadius: N → border-radius: Npx

// 四角独立设置：rectangleCornerRadii: [TL, TR, BR, BL]

// → border-radius: TLpx TRpx BRpx BLpx

```

  

**阴影**：

```javascript

// effects[].type === 'DROP_SHADOW'

const s = effect;

// → box-shadow: s.offset.x px  s.offset.y px  s.radius px  s.spread px  rgba(r,g,b,a)

// type === 'INNER_SHADOW' → box-shadow: inset ...

  

// effects[].type === 'BACKGROUND_BLUR'

// → backdrop-filter: blur(N px)

  

// effects[].type === 'LAYER_BLUR'

// → filter: blur(N px)

```

  

**不透明度**：

```javascript

// node.opacity !== 1 → style="opacity:N"

// blendMode: 'MULTIPLY' → mix-blend-mode: multiply  （罕见，通常不需要）

```

  

### 7.3 文字映射

  

```javascript

// TEXT 节点

const style = node.style;

const css = {

  fontFamily:    `"${style.fontFamily}", sans-serif`,

  fontSize:      `${style.fontSize}px`,

  fontWeight:    style.fontWeight,              // 400/500/600/700

  lineHeight:    style.lineHeightUnit === 'PIXELS'

                   ? `${style.lineHeightPx}px`

                   : `${style.lineHeightPercentFontSize}%`,

  letterSpacing: `${style.letterSpacing}px`,   // 0 时省略

  textAlign:     style.textAlignHorizontal.toLowerCase(), // left/center/right

  textDecoration: style.textDecoration === 'UNDERLINE' ? 'underline' : 'none',

  textTransform:  style.textCase === 'UPPER' ? 'uppercase' : 'none',

};

  

// 多行文字省略：node.textTruncation === 'ENDING' → overflow:hidden; text-overflow:ellipsis; white-space:nowrap

```

  

**已有 CSS 变量优先**（style.css 中的变量替代硬编码颜色）：

  

```

#003da6 / rgb(0,61,166)  → var(--primary)

#171c1f                  → var(--text-primary)

#434654                  → var(--text-secondary)

#6b7280                  → var(--text-muted)

#f5f7fa                  → var(--bg-page)

#ffffff                  → var(--bg-white)

#e8ecf1                  → var(--border)

#2f9e44                  → var(--success)

#f08c00                  → var(--warning)

#e03131                  → var(--danger)

```

  

### 7.4 组件实例映射

  

Figma 的 INSTANCE 节点引用了组件库中的主版本。映射到已有 HTML 组件类：

  

| Figma 组件名（常见） | HTML class | 备注 |

|--------------------|-----------|------|

| Button / Primary Button | `.btn.btn-primary` | — |

| Button / Secondary | `.btn` | — |

| Button / Danger | `.btn.btn-danger` | — |

| Button / Small | `.btn.btn-sm` | — |

| Tag / Status | `.tag.tag-{status}` | dev/review/published/... |

| Tag / Source | `.source-badge.source-{type}` | platform/third/stock |

| Scope Pill | `.scope-pill.scope-{scope}` | public/specific/private |

| Input | `.input` | — |

| Select | `.select` | — |

| Checkbox | `<input type="checkbox">` | — |

| Avatar | `.user-avatar` | — |

| Notification Bell | `.icon-btn` | — |

  

### 7.5 交互映射（interaction-spec → JS/HTML 实现）

  

| navType | HTML 实现 |

|---------|----------|

| `navigate` | `<a href="目标.html?params">` 或 `window.location.href='...'` |

| `overlay`（modal） | `document.getElementById('modalId').classList.remove('hidden')` |

| `overlay`（drawer） | `document.getElementById('drawerId').classList.add('drawer-open')` |

| `tab-switch` | `Proto.bindTabs()` 模式，或手动切换 `.tab-panel[data-tab]` 显隐 |

| `back` | `history.back()` 或固定 `<a href="parent.html">返回</a>` |

| `scroll-to` | `document.getElementById('targetId').scrollIntoView({behavior:'smooth'})` |

| `close-modal` | `modal.classList.add('hidden')` |

| `context-menu` | 绝对定位浮层，`position:fixed`，click outside 关闭 |

  

---

  

## 8. 嵌入现有项目规范

  

### 8.1 文件命名规范

  

```

prototype/

  11-user-feedback.html          ← 用户反馈列表

  11-user-feedback-detail.html   ← 用户反馈详情

  12-expert-workbench.html       ← 专家工作台（我的任务 + 专家社区 Tab）

  12-expert-task-detail.html     ← 做任务详情

  12-expert-context.html         ← 查看上下文

  13-permission-mgmt.html        ← 权限与开发者管理列表

  13-permission-edit.html        ← 编辑开发者

  13-permission-view.html        ← 查看开发者

  13-permission-add.html         ← 新增开发者账号

  13-org-structure.html          ← 组织架构

  assets/

    ops-user-feedback.js         ← 用户反馈模块 JS

    ops-expert.js                ← 专家工作台模块 JS

    ops-permission.js            ← 权限管理模块 JS

    ops-message.js               ← 消息中心（全局浮层）

```

  

**命名规则**：

- 编号 `11~19` 接续现有 `01~10`（不跳号）

- 同模块子页用相同编号前缀 + 语义后缀

- JS 模块名匹配 HTML 模块名：`11-*.html` → `assets/ops-user-feedback.js`

  

### 8.2 每个 HTML 文件的必须结构

  

```html

<!DOCTYPE html>

<html lang="zh-CN">

<head>

  <meta charset="UTF-8">

  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>页面标题 - 敖钦 AI</title>

  <!-- 唯一 CSS 来源，禁止新建 CSS 文件 -->

  <link rel="stylesheet" href="assets/style.css">

</head>

<body>

  

<!-- topbar：由 proto.js 的 initTopbar() 注入，不要手写 -->

<header class="topbar" id="topbar"></header>

  

<div class="app-frame">

  <div class="layout">

  

    <!-- sidebar：ops 模式侧边栏，高亮当前活跃项 -->

    <aside class="sidebar" id="sidebar"></aside>

  

    <main class="main" id="mainContent">

      <!-- 页头：左边标题，右边主操作按钮 -->

      <div class="page-header">

        <div class="page-header-left">

          <h1 class="page-title">模块名称</h1>

          <p class="page-desc">说明文字</p>

        </div>

        <div class="page-header-right">

          <button class="btn btn-primary">＋ 主操作</button>

        </div>

      </div>

  

      <!-- 筛选区（如有） -->

      <div class="filter-bar">...</div>

  

      <!-- 内容区 -->

      <section class="card">

        <table class="data-table">...</table>

      </section>

    </main>

  

  </div>

</div>

  

<!-- 弹窗（按需，初始 hidden） -->

<div class="modal-overlay hidden" id="someModal" role="dialog">

  <div class="modal-box">

    <div class="modal-header">

      <h2>弹窗标题</h2>

      <button class="icon-btn modal-close" data-close="someModal">✕</button>

    </div>

    <div class="modal-body"><!-- 内容 --></div>

    <div class="modal-footer">

      <button class="btn" id="cancelBtn">取消</button>

      <button class="btn btn-primary" id="confirmBtn">确认</button>

    </div>

  </div>

</div>

  

<!-- 抽屉（如消息中心，初始 hidden） -->

<div class="drawer-overlay hidden" id="messageDrawer">

  <div class="drawer-panel">...</div>

</div>

  

<!-- 脚本：proto.js 必须第一个，模块 JS 第二个 -->

<script src="assets/proto.js"></script>

<script src="assets/ops-user-feedback.js"></script>

<script>

  // 初始化导航

  Proto.initTopbar('ops');

  // 高亮当前侧边栏项

  Proto.setActiveSidebarLink('11-user-feedback.html');

  // 页面特定初始化（如从 URL 读取参数）

  const params = new URLSearchParams(location.search);

  const feedbackId = params.get('id');

</script>

  

</body>

</html>

```

  

### 8.3 侧边栏集成

  

**读取 proto.js 的侧边栏渲染逻辑**（每次新增模块前必须先读此文件）：

  

```bash

grep -n "sidebar\|SIDEBAR\|sidebar-link\|renderSidebar" prototype/assets/proto.js

```

  

按实际代码决定修改位置。**通用修改方式**：找到侧边栏链接数组，添加新模块：

  

```javascript

// proto.js 中的侧边栏配置（示意，实际以读取结果为准）

const OPS_SIDEBAR = [

  // ... 现有链接 ...

  { label: '用户反馈',         href: '11-user-feedback.html',  icon: '💬', group: '运营工作台' },

  { label: '专家工作台',       href: '12-expert-workbench.html', icon: '🔧', group: '运营工作台' },

  { label: '权限与开发者管理', href: '13-permission-mgmt.html',  icon: '🔑', group: '系统管理' },

];

```

  

### 8.4 Proto.js 函数使用规范

  

```javascript

// ✅ 正确

Proto.initTopbar('ops');              // ops 模式（运营平台），或 'dev'（开发平台）

Proto.href('11-user-feedback.html'); // 带 agent 上下文的链接

Proto.href('05-agent-detail.html', { tab: 'ops' }); // 附加参数

Proto.toast('保存成功');              // 轻提示，默认 2400ms

Proto.toast('操作成功', 3000);        // 自定义持续时间

  

// ❌ 错误

'11-user-feedback.html?id=xxx'       // 硬编码，丢失 agent 上下文

Proto.initTopbar();                  // 漏掉模式参数

```

  

### 8.5 JS 模块编写规范

  

```javascript

// assets/ops-user-feedback.js

// 职责：用户反馈页面的 UI 交互逻辑

  

(function(global) {

  'use strict';

  

  // ── 私有状态 ──────────────────────────────────────────

  let currentFeedbackId = null;

  

  // ── 数据（Demo 静态数据，生产替换为 API）──────────────

  const DEMO_FEEDBACK_LIST = [

    { id: 'fb001', title: '回复速度太慢', type: '性能', status: 'pending', time: '2026-06-01' },

    // ...

  ];

  

  // ── 渲染函数 ─────────────────────────────────────────

  function renderFeedbackTable() {

    const tbody = document.querySelector('#feedbackTable tbody');

    if (!tbody) return;

    tbody.innerHTML = DEMO_FEEDBACK_LIST.map(fb => `

      <tr>

        <td>${fb.id}</td>

        <td>${fb.title}</td>

        <td><span class="tag tag-${fb.status}">${statusLabel(fb.status)}</span></td>

        <td>

          <a href="${Proto.href('11-user-feedback-detail.html', { id: fb.id })}">查看</a>

        </td>

      </tr>

    `).join('');

  }

  

  function statusLabel(status) {

    return { pending:'待处理', processing:'处理中', closed:'已关闭' }[status] || status;

  }

  

  // ── 弹窗交互 ─────────────────────────────────────────

  function bindModals() {

    // 通用关闭逻辑：data-close="modalId"

    document.addEventListener('click', function(e) {

      const closeTarget = e.target.dataset.close;

      if (closeTarget) {

        document.getElementById(closeTarget)?.classList.add('hidden');

      }

      // 点击 overlay 背景关闭

      if (e.target.classList.contains('modal-overlay')) {

        e.target.classList.add('hidden');

      }

    });

  }

  

  // ── sessionStorage 状态 ──────────────────────────────

  function saveFeedbackState(feedbackId) {

    sessionStorage.setItem('proto_feedback_current', feedbackId);

  }

  function getFeedbackState() {

    return sessionStorage.getItem('proto_feedback_current');

  }

  

  // ── 初始化入口 ────────────────────────────────────────

  function init() {

    renderFeedbackTable();

    bindModals();

  }

  

  document.addEventListener('DOMContentLoaded', init);

  

  // 暴露给 window（如果其他模块需要调用）

  global.FeedbackModule = { saveFeedbackState, getFeedbackState };

  

})(window);

```

  

**注意**：

- 用 IIFE 包裹，避免全局污染

- sessionStorage 键必须用 `proto_<module>_` 前缀

- 不要在 JS 文件中直接拼接 HTML URL，统一用 `Proto.href()`

- Demo 数据用 `DEMO_` 前缀常量，便于后续替换

  

### 8.6 验收脚本更新

  

每加入一批新页面后，必须更新以下脚本：

  

**① `prototype/scripts/package-check.js`** — 页面完整性检查

  

```javascript

// 找到 EXPECTED_FILES 数组，追加新文件名

const EXPECTED_FILES = [

  // ...现有 16 个...

  '11-user-feedback.html',

  '11-user-feedback-detail.html',

  '12-expert-workbench.html',

  // ...

];

```

  

**② `prototype/scripts/smoke-check.js`** — 关键词存在性检查

  

如果新页面有核心关键词（如特定 class 名或 ID），加入检查列表：

  

```javascript

// smoke-check 中的关键词列表（示意）

const PAGE_KEYWORDS = {

  '11-user-feedback.html': ['feedbackTable', 'filter-bar', 'data-table'],

  '12-expert-workbench.html': ['expertTabs', 'taskList'],

};

```

  

**③ `prototype/scripts/navigation-journey-check.js`** — 路径测试

  

只在新页面参与 `index.html → 新页面 → 返回 → 再进入` 的来回流程时才需要修改。

纯侧边栏入口（不从 index 跳转）不需要修改。

  

---

  

## 9. 验收标准与流程

  

### 9.1 自动化验收（每批次完成后必须全部 PASS）

  

```bash

node prototype/scripts/verify-all.js

```

  

6 步说明：

  

| 步骤 | 脚本 | 检查内容 |

|------|------|---------|

| 1 | package-check.js | 所有 EXPECTED_FILES 存在，无断链 |

| 2 | smoke-check.js | JS 文件语法正确（node --check），关键词存在 |

| 3 | e2e-check.js | 主路径逻辑关键词（submit/save 等） |

| 4 | regression-check.js | vm 加载 proto.js 不崩溃，Skills ≥ 6 条 |

| 5 | browser-check.js | jsdom 加载 5 个关键页，DOM 结构正确 |

| 6 | navigation-journey-check.js | index↔05 二次进入，firstConfig，双次 wire |

  

**任何步骤 FAIL → 不能声明完成，必须先修复**。

  

### 9.2 视觉对比（每帧完成后）

  

```bash

# Step 1：启动本地服务

cd prototype

python -m http.server 8766

  

# Step 2：在浏览器打开（figma=1 参数触发 figma-capture.js 的预处理）

# http://127.0.0.1:8766/11-user-feedback.html?figma=1

  

# Step 3：在 Figma 打开对应帧，并排对比

```

  

**视觉对比检查项**：

  

| 维度 | 检查内容 |

|------|---------|

| 间距 | 卡片内边距、元素间 gap、表格行高 |

| 颜色 | 背景色、文字颜色、状态标签颜色 |

| 字号 | 标题/正文/辅助文字的字号层次 |

| 圆角 | 卡片、按钮、标签的圆角大小 |

| 阴影 | 卡片/下拉/弹窗的投影效果 |

| 对齐 | 左对齐/居中/右对齐，表格列对齐 |

| 按钮 | 位置、大小、颜色、文字 |

| 状态 | 标签颜色与 Figma 一致（published=绿，review=橙…） |

  

### 9.3 交互路径验收

  

对照 `design/interaction-spec.json`，逐条验证：

  

```

对每个 flow：

  1. 找到触发元素（by element 描述）

  2. 执行 trigger（click / 悬停等）

  3. 确认目标（页面跳转 / 弹窗打开 / Tab 切换）

  4. 关闭或返回，确认状态恢复

  5. 在 interaction-spec.json 中该 flow 标记 verified: true

```
  
### 9.4 ADR 登记要求

  

每个新模块（新 HTML 文件 + 新 JS 模块 + 新 sessionStorage 键）都需要在 `.github/agent/memory/decisions-log.md` 中添加 ADR：

  

```markdown

## ADR-00X: [模块名] 页面架构（YYYY-MM-DD）


**Status**: Accepted

  

**Context**:

新增 [模块名] 模块，对应 Figma 运营平台 Page 中的 [Frame 清单]。

  

**Decision**:

1. HTML 文件：[文件名列表]

2. JS 模块：[assets/ops-*.js]

3. sessionStorage 键前缀：proto_[module]_*

4. 侧边栏入口：[label + href]

  

**Consequences**:

verify-all.js 中 package-check 需更新 EXPECTED_FILES。

```

  

---

  

## 10. 问题排查手册

  

### 10.1 数据提取阶段

  

| 问题 | 原因 | 解决方案 |

|------|------|---------|

| `403 Forbidden` | Token 无效或无文件读权限 | 重新生成 PAT，确认勾选 "File content: Read" |

| `429 Too Many Requests` | 速率限制 | 等待 60s 重试，或改用 Figma Desktop MCP |

| JSON 解析失败（`Unexpected token '�'`） | PowerShell 写入了 UTF-8 BOM | 读取时 `stripBOM(text)`，或用 `[System.IO.File]::WriteAllText(..., UTF8NoBOM)` |

| 响应超时（文件过大） | 整文件 >200MB | 改用 `/nodes?ids=pageId&geometry=paths` 按页提取 |

| `interactions` 全为空 | 设计师未配置原型跳转 | 正常现象，按第5章手工重建交互规格 |

| `components.Count === 0` | 组件未发布到库 | 组件是局部的，在节点 JSON 的 `components` 字段里查找 |

  

### 10.2 数据解析阶段

  

| 问题 | 原因 | 解决方案 |

|------|------|---------|

| Frame 没出现在清单里 | 顶层节点不是 FRAME 类型 | 检查 `type` 字段，TEXT/RECTANGLE 注释节点不是帧 |

| 尺寸为 0×0 | 没有 `absoluteBoundingBox` | 用 `size` 字段替代，或直接读父容器尺寸 |

| 找不到节点 ID | 帧 ID 格式问题 | Figma ID 格式为 `数字:数字`，URL 中 `-` 需换为 `:` |

| 文件读取 OOM | 单个 JSON 超过 Node.js 内存限制 | 设置 `--max-old-space-size=4096`：`node --max-old-space-size=4096 script.js` |

  

### 10.3 代码生成阶段

  

| 问题 | 原因 | 解决方案 |

|------|------|---------|

| 布局偏移/错位 | Figma 绝对布局 vs CSS 相对布局冲突 | 绝对定位帧改用 `position:relative` + `absolute` 精确复刻；AutoLayout 帧用 flexbox |

| 颜色不匹配 | Figma 颜色是 0~1 范围，CSS 是 0~255 | 转换：`Math.round(r*255)` |

| 字体偏差 | 本地没有 Figma 文件中使用的字体 | 用 style.css 已有字体栈替代；需要特定字体时引入 Google Fonts |

| 组件看起来不同 | INSTANCE 覆盖了主版本的属性 | 读 INSTANCE 节点自身的 `componentProperties` 或 `overrides` |

| 弹窗被遮挡 | z-index 问题 | `.modal-overlay { z-index: 1000 }` 已在 style.css 定义，检查是否引入了 CSS |

  

### 10.4 项目集成阶段

  

| 问题 | 原因 | 解决方案 |

|------|------|---------|

| `Proto is not defined` | proto.js 未引入或顺序错误 | `<script src="assets/proto.js">` 必须在模块 JS 之前 |

| 侧边栏不显示 | `initTopbar` 参数错误 | 传 `'ops'` 而非 `'dev'`；检查 proto.js 的 topbar 渲染逻辑 |

| 链接跳转丢失 agent 上下文 | 硬编码 URL | 改用 `Proto.href('page.html', params)` |

| Tab 切换不工作 | 没有调用 tab 绑定函数 | 参考 `05-agent-detail.html` 的 Tab 初始化方式 |

| verify-all.js 报页面缺失 | 新页面未加入 package-check.js | 更新 `EXPECTED_FILES` 数组 |

| smoke-check FAIL（语法错误） | 新 JS 文件有语法错误 | 运行 `node --check assets/ops-new.js` 单独检查 |

  

### 10.5 视觉对比阶段

  

| 问题 | 解决方案 |

|------|---------|

| 间距明显偏差 | 检查 Figma 的 `itemSpacing` 和 `padding` 是否正确读取；style.css 中的间距变量是否匹配 |

| 颜色看起来不一样 | 用浏览器 DevTools 的取色工具对比；可能是 opacity 叠加导致 |

| 字号/行高偏差 | Figma 行高可能是百分比（如 150%），转换为 `1.5` 或 `Npx` |

| 布局整体不对 | 这帧可能是绝对定位而非 AutoLayout；查 `layoutMode` 是否为空 |

  

### 10.6 降级策略总结

  

```

数据提取失败（429/超时）

  → 改用按页分批提取（/nodes?ids=pageId）

  → 或使用已提取的 01-file-tree.json（有 Frame 清单即可开始分析）

  

Figma Desktop MCP 不可用

  → 降级到方式 2（REST API JSON）

  → 再降级到方式 3（截图 + Claude Vision）

  

JS 语法报错导致 verify-all 失败

  → node --check assets/ops-xxx.js 定位具体行

  → 检查 IIFE 括号是否对称

  → 检查是否有 ES6+ 语法在不支持的环境中使用

  

视觉偏差较大无法对齐

  → 优先保证交互流程正确（这是原型的核心价值）

  → 视觉精度降级为"语义一致"而非"像素一致"

  → 在 DELIVERY-CHECKLIST.md 中记录已知视觉偏差

```

  

---

  

## 11. 本项目实际数据（附录）

  

### A. Figma 文件信息

  

```

文件 Key：gDc0xlVkOeJdgrQOZMy3wh

链接：https://www.figma.com/design/gDc0xlVkOeJdgrQOZMy3wh/智能体开发平台

Token：<YOUR_FIGMA_PAT>（请使用本地环境变量或私密配置，勿写入仓库）

```

  

### B. 三个 Page 概况

  

| Page | ID | 帧数 | 状态 | 主要内容 |

|------|-----|------|------|---------|

| 运营平台 | 241:250 | 38 | ❌ 待转换 | 专家工作台/用户反馈/任务分派/消息中心/权限管理/运营审核 |

| 智能体运营 | 0:1 | ~8 | ✅ 已转换 | 智能体创建/发布/运营/第三方接入 |

| Skills 配置 | 46:312 | ~4 | ✅ 已转换 | Skills 管理页 |

  

### C. 运营平台 38 帧完整清单

  

| # | Frame 名 | Frame ID | 尺寸 | 类型 | 所属模块 | 目标 HTML |

|---|---------|----------|------|------|---------|----------|

| 1 | 专家工作台-我的任务 | 243:272 | 1440×1139 | fullpage | 专家工作台 | 12-expert-workbench.html |

| 2 | 专家工作台-我的任务-进行中的任务 | 243:552 | 1440×962 | fullpage | 专家工作台 | 12-expert-workbench.html#tab-in-progress |

| 3 | 运营管理-用户反馈 | 243:955 | 1440×1300 | fullpage | 用户反馈 | 11-user-feedback.html |

| 4 | 运营/管理分派任务-指定团队 | 243:1770 | 944×384 | modal | 任务分派 | 11-user-feedback-detail.html#modal-dispatch-team |

| 5 | 运营/管理分派任务-指定专家 | 243:1892 | 992×808 | modal | 任务分派 | 11-user-feedback-detail.html#modal-dispatch-expert |

| 6 | 专家工作台-我的任务-进行中的任务-做任务 | 243:2109 | 1440×1126 | fullpage | 专家工作台 | 12-expert-task-detail.html |

| 7 | 运营管理-…-做任务-查看上下文 | 243:2345 | 1440×1126 | fullpage | 专家工作台 | 12-expert-context.html |

| 8 | 专家工作台-专家社区-任务池 | 243:2555 | 1440×938 | fullpage | 专家工作台 | 12-expert-workbench.html#tab-community |

| 9 | 专家操作（操作菜单）| 243:2964 | 136×88 | tooltip | 专家工作台 | 内嵌 contextmenu |

| 10 | 运营操作（操作菜单）| 243:2971 | 136×132 | tooltip | 用户反馈 | 内嵌 contextmenu |

| 11 | Frame 25（操作菜单） | 243:2980 | 112×104 | tooltip | 任务分派 | 内嵌 contextmenu |

| 12 | 申请延时 | 243:2986 | 848×378 | modal | 专家工作台 | 内嵌 modal |

| 13 | 专家操作（另一状态）| 243:3021 | 122×88 | tooltip | 专家工作台 | 内嵌 contextmenu |

| 14 | 消息中心-公告 | 243:3028 | 640×836 | drawer | 消息中心 | topbar 铃铛 → drawer |

| 15 | （运营）消息中心-待办 | 243:3121 | 640×836 | drawer | 消息中心 | topbar 铃铛 → drawer |

| 16 | 运营管理-权限…-开发者管理 | 243:3270 | 1440×946 | fullpage | 权限管理 | 13-permission-mgmt.html |

| 17 | 运营管理-权限…-开发者管理-编辑 | 243:3857 | 1440×1662 | fullpage | 权限管理 | 13-permission-edit.html |

| 18 | 运营管理-权限…-开发者管理-查看 | 243:4645 | 1440×1178 | fullpage | 权限管理 | 13-permission-view.html |

| 19 | 运营管理-权限…-新增开发者账号 | 243:4990 | 1440×1530 | fullpage | 权限管理 | 13-permission-add.html |

| 20 | 普通管理只能查看 | 243:5689 | 77×484 | tooltip | 权限管理 | 内嵌 tooltip |

| 21 | 删除确认 | 243:5723 | 294×193 | modal | 权限管理 | 内嵌 modal |

| 22 | Peak Indicator | 243:5742 | 220×32 | tooltip | 图表 | 内嵌 tooltip |

| 23 | （运营视角）专家社区-查看任务详情 | 243:5747 | 1440×1067 | fullpage | 专家工作台 | 12-expert-task-view.html |

| 24 | 多个专家处理 | 243:6026 | 1136×500 | modal | 任务分派 | 内嵌 modal（任务流转图）|

| 25 | 修改截止时间 | 243:6162 | 492×104 | modal | 任务分派 | 内嵌 modal |

| 26 | 运营管理-权限…-组织架构 | 243:6186 | 1440×942 | fullpage | 权限管理 | 13-org-structure.html |

| 27 | 用户反馈-查看详情 | 243:6859 | 1440×1245 | fullpage | 用户反馈 | 11-user-feedback-detail.html |

| 28 | （个人）处理反馈弹窗 | 243:7114 | 519×296 | modal | 用户反馈 | #modal-process-personal |

| 29 | （团队负责人）处理反馈弹窗 1 | 243:7143 | 647×296 | modal | 用户反馈 | #modal-process-team |

| 30 | （运营）处理反馈弹窗 1 | 243:7175 | 647×296 | modal | 用户反馈 | #modal-process-ops |

| 31 | （团队负责人）处理反馈弹窗 2 | 243:7207 | 647×264 | modal | 用户反馈 | 同 #modal-process-team（状态变体）|

| 32 | （运营）处理反馈弹窗 2 | 243:7253 | 647×264 | modal | 用户反馈 | 同 #modal-process-ops（状态变体）|

| 33 | （运营）处理反馈弹窗 3 | 243:7299 | 928×740 | modal | 用户反馈 | 同 #modal-process-ops（完整版）|

| 34 | 运营审核（操作菜单）| 243:7519 | 211×146 | tooltip | 运营审核 | 内嵌 contextmenu |

| 35 | 审核专家任务 | 243:7529 | 1440×1186 | fullpage | 运营审核 | 08-audit-expert.html |

| 36 | 退回理由弹窗 | 243:7772 | 848×378 | modal | 运营审核 | #modal-reject-reason |

| 37 | （专家）消息中心-待办 | 243:7807 | 640×836 | drawer | 消息中心 | topbar 铃铛 → drawer（专家视角）|

| 38 | （团队负责人/团队个人）消息中心-待办 | 243:7948 | 640×836 | drawer | 消息中心 | topbar 铃铛 → drawer（团队视角）|

  

### D. 已提取的数据文件

  

```

design/figma-extract/

  01-file-tree.json           (476 KB)  ← 文件树（depth=2）

  01-file-tree-d3.json       (1.8 MB)  ← 文件树（depth=3）

  03-components.json          (0.2 KB)  ← 组件库（本文件无发布组件）

  04-styles.json              (0.2 KB)  ← 样式库（本文件无发布样式）

  05-ops-platform-nodes.json  (112 MB)  ← 运营平台完整节点数据

design/scripts/

  analyze-frames.js           ← 帧清单提取脚本

  inspect-interactions.js     ← 交互字段检查脚本

  deep-frame-analysis.js      ← 帧详情分析脚本

  extract-frame.js            ← 单帧 JSON 提取器（待创建）

design/

  figma-frame-list.json       ← 43 帧清单

  figma-gap-report.json       ← 38 帧缺口报告

  figma-frame-details.json    ← 每帧尺寸+文本样本

  figma-nav-map.json          ← 6 模块导航结构

  interaction-spec.json       ← 待创建（手工定义交互规格）

```

  

### E. 现有项目的设计系统 Token（style.css 核心变量）

  

```css

--primary:        #003da6;   --primary-hover: #002d7a;   --primary-light: #d9e2ff;

--success:        #2f9e44;   --warning:       #f08c00;   --danger:        #e03131;

--text-primary:   #171c1f;   --text-secondary:#434654;   --text-muted:    #6b7280;

--bg-page:        #f5f7fa;   --bg-white:      #ffffff;   --border:        #e8ecf1;

--side:           240px;     /* 侧边栏宽度 */

```
  

---
  

*文档结束。生产工作（Phase 3 逐帧转换）从 `design/interaction-spec.json` 和 `design/scripts/extract-frame.js` 的创建开始。*