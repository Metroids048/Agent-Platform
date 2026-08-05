from __future__ import annotations

import re
from pathlib import Path

try:
    from docx import Document
    from docx.enum.section import WD_ORIENT
    from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn
    from docx.shared import Cm, Inches, Pt, RGBColor
except Exception as exc:  # pragma: no cover - dependency guard for operator visibility
    raise SystemExit(f"Missing python-docx dependency: {exc}") from exc

try:
    from PIL import Image, ImageDraw, ImageFont
except Exception as exc:  # pragma: no cover
    raise SystemExit(f"Missing Pillow dependency: {exc}") from exc


ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
ASSETS = DOCS / "assets"
OUT_DOCX = DOCS / "敖钦AI中台总体建设方案_优化版.docx"
IMG_OVERVIEW = ASSETS / "aoqin_ai_midplatform_overview.png"
IMG_FLOW = ASSETS / "aoqin_ai_midplatform_flow.png"

BLUE = "2563EB"
DARK = "1F2937"
MID = "64748B"
LIGHT_BLUE = "EAF2FF"
PALE_GREEN = "ECFDF5"
PALE_ORANGE = "FFF7ED"
PALE_PURPLE = "F5F3FF"
PALE_GRAY = "F8FAFC"
BORDER = "CBD5E1"
GREEN = "16A34A"
ORANGE = "F59E0B"
PURPLE = "7C3AED"
RED = "DC2626"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        Path("C:/Windows/Fonts/msyhbd.ttc") if bold else Path("C:/Windows/Fonts/msyh.ttc"),
        Path("C:/Windows/Fonts/simhei.ttf"),
        Path("C:/Windows/Fonts/simsun.ttc"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def text_size(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.ImageFont) -> tuple[int, int]:
    bbox = draw.textbbox((0, 0), text, font=fnt)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def wrap_text(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.ImageFont, width: int) -> list[str]:
    lines: list[str] = []
    for part in text.split("\n"):
        current = ""
        for ch in part:
            trial = current + ch
            if text_size(draw, trial, fnt)[0] <= width or not current:
                current = trial
            else:
                lines.append(current)
                current = ch
        if current:
            lines.append(current)
    return lines


def rounded(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill: str, outline: str = BORDER, width: int = 2, radius: int = 22) -> None:
    fill_color = fill if fill.startswith("#") else "#" + fill
    outline_color = outline if outline.startswith("#") else "#" + outline
    draw.rounded_rectangle(box, radius=radius, fill=fill_color, outline=outline_color, width=width)


def draw_center_text(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    title: str,
    subtitle: str = "",
    *,
    title_color: str = DARK,
    subtitle_color: str = MID,
    title_size: int = 26,
    subtitle_size: int = 19,
) -> None:
    x1, y1, x2, y2 = box
    title_font = font(title_size, True)
    sub_font = font(subtitle_size)
    max_width = x2 - x1 - 34
    title_lines = wrap_text(draw, title, title_font, max_width)
    sub_lines = wrap_text(draw, subtitle, sub_font, max_width) if subtitle else []
    title_h = sum(text_size(draw, line, title_font)[1] + 7 for line in title_lines)
    sub_h = sum(text_size(draw, line, sub_font)[1] + 5 for line in sub_lines)
    total = title_h + sub_h + (8 if sub_lines else 0)
    y = y1 + ((y2 - y1) - total) // 2
    for line in title_lines:
        w, h = text_size(draw, line, title_font)
        draw.text((x1 + (x2 - x1 - w) / 2, y), line, font=title_font, fill="#" + title_color)
        y += h + 7
    if sub_lines:
        y += 4
    for line in sub_lines:
        w, h = text_size(draw, line, sub_font)
        draw.text((x1 + (x2 - x1 - w) / 2, y), line, font=sub_font, fill="#" + subtitle_color)
        y += h + 5


def arrow(draw: ImageDraw.ImageDraw, start: tuple[int, int], end: tuple[int, int], color: str = BLUE, width: int = 5) -> None:
    draw.line([start, end], fill="#" + color, width=width)
    sx, sy = start
    ex, ey = end
    if abs(ex - sx) >= abs(ey - sy):
        direction = 1 if ex >= sx else -1
        points = [(ex, ey), (ex - direction * 18, ey - 11), (ex - direction * 18, ey + 11)]
    else:
        direction = 1 if ey >= sy else -1
        points = [(ex, ey), (ex - 11, ey - direction * 18), (ex + 11, ey - direction * 18)]
    draw.polygon(points, fill="#" + color)


def label(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, color: str = MID, size: int = 18) -> None:
    draw.text(xy, text, font=font(size), fill="#" + color)


def make_overview() -> None:
    W, H = 2400, 1500
    img = Image.new("RGB", (W, H), "white")
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, W, H), fill="#F8FAFC")
    draw.text((70, 50), "敖钦 AI 中台总体能力全景图", font=font(44, True), fill="#0F172A")
    draw.text((70, 112), "以用户端为入口、以智能体为对象、以运营治理为中枢、以知识/模型/资源/系统能力为底座，形成建设、发布、使用、反馈、优化的全平台闭环。", font=font(24), fill="#475569")

    # Main layer blocks
    user = (70, 210, 410, 890)
    ops = (470, 210, 900, 890)
    dev = (960, 210, 1390, 890)
    knowledge = (1450, 210, 1780, 530)
    model = (1840, 210, 2260, 530)
    resource = (1450, 570, 1780, 890)
    system = (1840, 570, 2260, 890)

    for box, fill, outline, title in [
        (user, PALE_ORANGE, ORANGE, "用户端"),
        (ops, LIGHT_BLUE, BLUE, "运营管理"),
        (dev, PALE_GREEN, GREEN, "智能体开发"),
        (knowledge, "F0FDFA", "0D9488", "知识库"),
        (model, "EEF2FF", "4F46E5", "模型协同"),
        (resource, PALE_PURPLE, PURPLE, "资源服务"),
        (system, "F1F5F9", "475569", "系统治理"),
    ]:
        rounded(draw, box, fill, outline, 4, 28)
        draw.text((box[0] + 28, box[1] + 24), title, font=font(30, True), fill="#" + outline)

    cards = [
        ((105, 310, 375, 405), "智能体使用", "搜索/收藏/最近使用/对话"),
        ((105, 435, 375, 530), "知识检索", "个人知识库/公共知识库/历史检索"),
        ((105, 560, 375, 655), "结果与引用", "文件结果/来源引用/下载"),
        ((105, 685, 375, 780), "反馈提交", "没解决/响应慢/理解有误/满意度"),
        ((505, 310, 865, 398), "智能体运营", "智能体管理/运营概括/审核工作台"),
        ((505, 420, 865, 508), "反馈与专家", "用户反馈/专家工作台/处理记录"),
        ((505, 530, 865, 618), "运营分析", "模型看板/业务看板/资源看板/画像"),
        ((505, 640, 865, 728), "权限与组织", "单位/部门/人员/角色/用户组"),
        ((505, 750, 865, 838), "监控计量", "系统监控/Token统计/审计留痕"),
        ((995, 310, 1355, 398), "应用编排", "智能体中心/能力网关/组件中心"),
        ((995, 420, 1355, 508), "流程与工具", "工作流/工具/MCP广场/智能体组件"),
        ((995, 530, 1355, 618), "提示与技能", "Skills中心/提示词工程/模板/框架"),
        ((995, 640, 1355, 728), "接入与配置", "知识库接入/模型管理/凭证/标签"),
        ((995, 750, 1355, 838), "开发体验", "预览调试/DeepSeek对话/智能编码助手"),
        ((1485, 310, 1745, 405), "知识服务", "知识检索/采编/接入/模型配置"),
        ((1485, 430, 1745, 505), "知识治理", "缺失补充/引用修正/质量更新"),
        ((1875, 310, 2225, 385), "模型服务", "基础模型/模型库/提供商/路由"),
        ((1875, 405, 2225, 505), "训练与评估", "数据集/微调任务/基准测试/部署"),
        ((1485, 670, 1745, 765), "算力与部署", "节点/GPU/推理后端/模型文件/集群"),
        ((1485, 790, 1745, 865), "资源计量", "用量/耗时/失败率/成本/容量"),
        ((1875, 670, 2225, 765), "身份与安全", "统一认证/API密钥/凭证/审计"),
        ((1875, 790, 2225, 865), "系统配置", "菜单/功能/接口/数据字典/告警"),
    ]
    for box, title, sub in cards:
        rounded(draw, box, "FFFFFF", BORDER, 2, 16)
        draw_center_text(draw, box, title, sub, title_size=22, subtitle_size=17)

    # Flow arrows between large areas
    arrow(draw, (410, 440), (470, 440), BLUE)
    label(draw, (418, 405), "使用/反馈/数据", BLUE)
    arrow(draw, (900, 445), (960, 445), GREEN)
    label(draw, (908, 410), "配置同步/发布", GREEN)
    arrow(draw, (1390, 440), (1450, 440), "0D9488")
    label(draw, (1395, 405), "知识挂载", "0D9488")
    arrow(draw, (1390, 710), (1450, 710), PURPLE)
    label(draw, (1397, 675), "资源调用", PURPLE)
    arrow(draw, (1780, 440), (1840, 440), "4F46E5")
    arrow(draw, (1780, 710), (1840, 710), "475569")

    # Governance support band
    support = (70, 970, 2260, 1155)
    rounded(draw, support, "FFFFFF", BLUE, 3, 26)
    draw.text((105, 1005), "治理支撑层", font=font(30, True), fill="#" + BLUE)
    support_items = [
        "组织权限", "角色菜单", "API Key/凭证", "审核发布", "运行日志",
        "反馈工单", "专家处理", "Token统计", "成本治理", "服务复盘"
    ]
    x = 285
    for item in support_items:
        rounded(draw, (x, 1010, x + 170, 1095), "F8FAFC", BORDER, 2, 18)
        draw_center_text(draw, (x, 1010, x + 170, 1095), item, "", title_size=20)
        x += 190

    base = (70, 1215, 2260, 1415)
    rounded(draw, base, "EFF6FF", BLUE, 3, 24)
    draw.text((105, 1250), "海能平台能力底座", font=font(30, True), fill="#" + BLUE)
    base_items = [
        ("AI 能力层", "智能体能力 / 知识服务 / 模型服务 / 工具能力"),
        ("基础资源层", "算力资源 / 推理部署 / 训练微调 / 认证鉴权 / 计量计费 / 租户隔离"),
    ]
    x = 420
    for title, sub in base_items:
        rounded(draw, (x, 1260, x + 780, 1368), "FFFFFF", "93C5FD", 2, 18)
        draw_center_text(draw, (x, 1260, x + 780, 1368), title, sub, title_size=24, subtitle_size=18)
        x += 850
    arrow(draw, (500, 970), (500, 890), BLUE)
    arrow(draw, (1490, 1215), (1490, 890), GREEN)
    draw.text((70, 1444), "说明：图中模块名称来自当前平台实际可见入口；测试数据、账号和临时样例不进入方案正文。", font=font(18), fill="#64748B")
    img.save(IMG_OVERVIEW, quality=95)


def make_flow() -> None:
    W, H = 2400, 1450
    img = Image.new("RGB", (W, H), "white")
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, W, H), fill="#F8FAFC")
    draw.text((70, 48), "全平台业务闭环与数据治理流转图", font=font(44, True), fill="#0F172A")
    draw.text((70, 112), "主链路覆盖智能体建设、审核上线、用户使用、运行监控、反馈处理、能力优化和计量审计；虚线表示数据回流与治理闭环。", font=font(24), fill="#475569")

    lanes = [
        ("用户端", 190, 330, PALE_ORANGE, ORANGE),
        ("运营管理平台", 365, 555, LIGHT_BLUE, BLUE),
        ("智能体开发平台", 590, 770, PALE_GREEN, GREEN),
        ("知识/模型/资源/系统能力", 805, 1035, "EEF2FF", "4F46E5"),
        ("治理输出", 1070, 1300, PALE_PURPLE, PURPLE),
    ]
    for name, y1, y2, fill, outline in lanes:
        rounded(draw, (70, y1, 2260, y2), fill, outline, 3, 24)
        draw.text((105, y1 + 28), name, font=font(25, True), fill="#" + outline)

    steps = [
        ((260, 405, 570, 515), "1", "创建智能体档案", "名称/负责人/可见范围/版本状态"),
        ((680, 625, 990, 735), "2", "配置应用能力", "提示词/工作流/工具/MCP/Skills/知识库/模型"),
        ((1100, 405, 1410, 515), "3", "发布审核", "范围/风险/展示信息/版本记录"),
        ((1520, 230, 1830, 310), "4", "用户端上线使用", "搜索/收藏/对话/引用/下载"),
        ((1520, 405, 1830, 515), "5", "运行监控汇聚", "用量/耗时/失败率/Token/成本"),
        ((1940, 230, 2215, 310), "6", "用户反馈", "未解决/响应慢/理解有误/满意度"),
        ((1940, 405, 2215, 515), "7", "生成处理任务", "专家工作台/责任平台/处理记录"),
        ((1620, 845, 1930, 955), "8", "能力优化回流", "知识补充/模型评估/资源排查/权限修正"),
        ((1020, 845, 1330, 955), "9", "底座能力纳管", "模型路由/微调部署/GPU节点/API密钥"),
        ((500, 1115, 835, 1235), "10", "治理沉淀", "状态可追踪/配置可回溯/成本可估算/审计可留痕"),
        ((950, 1115, 1285, 1235), "11", "看板复盘", "模型看板/业务看板/资源看板/用户与智能体画像"),
        ((1400, 1115, 1735, 1235), "12", "持续规划", "问题清单/优化计划/服务复盘/后续建设"),
    ]
    for box, num, title, sub in steps:
        rounded(draw, box, "FFFFFF", BORDER, 2, 18)
        x1, y1, x2, y2 = box
        draw.ellipse((x1 + 20, y1 + 28, x1 + 72, y1 + 80), fill="#" + ORANGE)
        draw.text((x1 + 37 - (8 if len(num) == 1 else 16), y1 + 38), num, font=font(22, True), fill="white")
        draw_center_text(draw, (x1 + 82, y1 + 8, x2 - 15, y2 - 8), title, sub, title_size=22, subtitle_size=17)

    # Main arrows
    arrow(draw, (570, 460), (680, 680), BLUE)
    arrow(draw, (990, 680), (1100, 460), GREEN)
    arrow(draw, (1410, 460), (1520, 270), BLUE)
    arrow(draw, (1830, 270), (1940, 270), ORANGE)
    arrow(draw, (1830, 460), (1940, 460), BLUE)
    arrow(draw, (2075, 515), (1775, 845), PURPLE)
    arrow(draw, (1620, 900), (1330, 900), GREEN)
    arrow(draw, (1175, 955), (1175, 1115), "4F46E5")
    arrow(draw, (835, 1175), (950, 1175), PURPLE)
    arrow(draw, (1285, 1175), (1400, 1175), PURPLE)

    # Feedback and data dashed lines
    for x in range(420, 1940, 36):
        draw.line((x, 260, x + 18, 260), fill="#" + ORANGE, width=4)
    arrow(draw, (1940, 260), (1940, 260), ORANGE)
    label(draw, (960, 225), "用户反馈与满意度回流", ORANGE)

    for y in range(515, 845, 32):
        draw.line((1675, y, 1675, y + 16), fill="#" + BLUE, width=4)
    arrow(draw, (1675, 515), (1675, 845), BLUE)
    label(draw, (1695, 640), "运行数据/计量数据", BLUE)

    for y in range(955, 405, -32):
        draw.line((1180, y, 1180, y - 16), fill="#" + GREEN, width=4)
    arrow(draw, (1180, 590), (1180, 405), GREEN)
    label(draw, (1205, 700), "配置与能力优化回写", GREEN)

    legend = (70, 1330, 2260, 1415)
    rounded(draw, legend, "FFFFFF", BORDER, 2, 18)
    items = [
        (115, "业务主链", BLUE),
        (380, "运行/计量数据", BLUE),
        (710, "反馈与工单", ORANGE),
        (1010, "配置/能力回流", GREEN),
        (1350, "审计与治理沉淀", PURPLE),
    ]
    for x, txt, col in items:
        draw.line((x, 1372, x + 90, 1372), fill="#" + col, width=6)
        draw.polygon([(x + 100, 1372), (x + 82, 1360), (x + 82, 1384)], fill="#" + col)
        draw.text((x + 125, 1352), txt, font=font(20), fill="#334155")
    img.save(IMG_FLOW, quality=95)


def set_cell_shading(cell, fill: str) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), fill)
    tc_pr.append(shd)


def set_cell_text(cell, text: str, bold: bool = False, color: str = DARK) -> None:
    cell.text = ""
    p = cell.paragraphs[0]
    run = p.add_run(text)
    run.bold = bold
    run.font.name = "微软雅黑"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "微软雅黑")
    run.font.size = Pt(9.5)
    run.font.color.rgb = RGBColor.from_string(color)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER


def add_table(doc: Document, headers: list[str], rows: list[list[str]], widths: list[float] | None = None) -> None:
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = "Table Grid"
    hdr = table.rows[0].cells
    for i, h in enumerate(headers):
        set_cell_shading(hdr[i], BLUE)
        set_cell_text(hdr[i], h, True, "FFFFFF")
    for row in rows:
        cells = table.add_row().cells
        for i, val in enumerate(row):
            set_cell_text(cells[i], val)
            if i == 0:
                set_cell_shading(cells[i], "EEF2FF")
    if widths:
        for row in table.rows:
            for i, width in enumerate(widths):
                row.cells[i].width = Cm(width)
    doc.add_paragraph()


def set_document_defaults(doc: Document) -> None:
    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = "微软雅黑"
    normal._element.rPr.rFonts.set(qn("w:eastAsia"), "微软雅黑")
    normal.font.size = Pt(10.5)
    for style_name, size, color in [
        ("Heading 1", 17, BLUE),
        ("Heading 2", 13, DARK),
        ("Heading 3", 11, DARK),
    ]:
        style = styles[style_name]
        style.font.name = "微软雅黑"
        style._element.rPr.rFonts.set(qn("w:eastAsia"), "微软雅黑")
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = RGBColor.from_string(color)


def add_para(doc: Document, text: str, *, bold_prefix: str | None = None) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.first_line_indent = Pt(21)
    p.paragraph_format.line_spacing = 1.25
    if bold_prefix and text.startswith(bold_prefix):
        r = p.add_run(bold_prefix)
        r.bold = True
        r.font.name = "微软雅黑"
        r._element.rPr.rFonts.set(qn("w:eastAsia"), "微软雅黑")
        p.add_run(text[len(bold_prefix):])
    else:
        p.add_run(text)


def add_bullets(doc: Document, items: list[str]) -> None:
    for item in items:
        p = doc.add_paragraph(style=None)
        p.paragraph_format.left_indent = Pt(18)
        p.paragraph_format.first_line_indent = Pt(-12)
        p.paragraph_format.line_spacing = 1.2
        p.add_run("• " + item)


def add_heading(doc: Document, text: str, level: int = 1) -> None:
    p = doc.add_heading(text, level=level)
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(6)


def add_image(doc: Document, path: Path, caption: str) -> None:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run().add_picture(str(path), width=Inches(6.85))
    c = doc.add_paragraph(caption)
    c.alignment = WD_ALIGN_PARAGRAPH.CENTER
    c.runs[0].font.size = Pt(9)
    c.runs[0].font.color.rgb = RGBColor.from_string(MID)


def make_doc() -> None:
    doc = Document()
    set_document_defaults(doc)
    sec = doc.sections[0]
    sec.page_width = Cm(21)
    sec.page_height = Cm(29.7)
    sec.top_margin = Cm(1.8)
    sec.bottom_margin = Cm(1.8)
    sec.left_margin = Cm(1.8)
    sec.right_margin = Cm(1.8)

    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = title.add_run("敖钦 AI 中台总体建设方案")
    r.bold = True
    r.font.name = "微软雅黑"
    r._element.rPr.rFonts.set(qn("w:eastAsia"), "微软雅黑")
    r.font.size = Pt(26)
    r.font.color.rgb = RGBColor.from_string("0F172A")
    sub = doc.add_paragraph()
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sr = sub.add_run("优化版")
    sr.font.name = "微软雅黑"
    sr._element.rPr.rFonts.set(qn("w:eastAsia"), "微软雅黑")
    sr.font.size = Pt(15)
    sr.font.color.rgb = RGBColor.from_string(BLUE)
    date = doc.add_paragraph()
    date.alignment = WD_ALIGN_PARAGRAPH.CENTER
    dr = date.add_run("2026年7月")
    dr.font.name = "微软雅黑"
    dr._element.rPr.rFonts.set(qn("w:eastAsia"), "微软雅黑")
    dr.font.size = Pt(11)
    doc.add_paragraph()

    add_heading(doc, "一、项目背景与总体定位")
    add_para(doc, "敖钦 AI 中台面向单位内部人工智能应用建设、运行服务和运营治理，目标不是建设单一后台系统，而是形成一套覆盖“应用创建、能力编排、审核发布、用户使用、问题反馈、持续优化、计量审计”的一体化平台体系。")
    add_para(doc, "从当前平台能力看，系统已形成运营管理、智能体开发、模型协同、知识库、智能编码助手等多个顶层入口，并在运营侧沉淀用户反馈、专家工作台、模型看板、业务看板、资源看板、用户与智能体画像、权限组织、系统监控和 Token 统计等治理能力。")
    add_para(doc, "平台总体定位为：以海能平台提供的模型、知识、算力、认证和计量等基础能力为底座，以智能体为核心应用对象，以运营管理平台为中枢，向前承接用户端服务入口，向后协同智能体开发、知识库、模型服务、资源服务、系统管理和智能编码助手，支撑 AI 应用从建设到优化的全生命周期闭环。")
    add_table(
        doc,
        ["职责", "说明"],
        [
            ["应用建设", "支持智能体、任务链、工作流、工具、MCP 服务、Skills、提示词、知识库、模型档位和凭证等能力编排，使底层 AI 能力转化为可使用、可管理、可复盘的业务应用。"],
            ["用户服务", "面向普通用户提供智能体搜索、收藏、对话、知识检索、引用查看、文件结果、反馈提交等服务入口，让 AI 能力进入日常业务场景。"],
            ["运营治理", "管理智能体状态、审核发布、可见范围、反馈处理、专家任务、运行监控、运营看板、Token 统计和持续优化，避免应用上线后缺乏治理。"],
            ["能力纳管", "统一连接知识库、模型协同、资源服务、系统管理和智能编码助手，将知识、模型、算力、工具、代码辅助等能力纳入统一建设和治理框架。"],
            ["数据闭环", "汇聚会话、反馈、引用、运行、计量、审计等数据，形成看板、工单和优化任务，推动知识补充、模型评估、资源排查和权限修正。"],
        ],
        [3.0, 13.5],
    )

    add_heading(doc, "二、敖钦 AI 中台运营全景")
    add_para(doc, "敖钦 AI 中台全景关系遵循“用户端在前、运营平台居中、开发平台承接建设、知识模型资源协同、系统治理托底”的原则。运营平台不是孤立的管理页面，而是连接用户使用、开发配置、知识更新、模型服务、资源计量和权限审计的治理枢纽。")
    add_image(doc, IMG_OVERVIEW, "图 1：敖钦 AI 中台总体能力全景图")
    add_table(
        doc,
        ["层面", "核心内容", "与全平台闭环的关系"],
        [
            ["用户端", "智能体搜索、收藏、对话、知识检索、引用查看、文件结果、反馈提交、个人/公共知识库使用。", "产生使用数据、反馈数据、引用数据、满意度和问题线索，是 AI 能力落地业务场景的入口。"],
            ["运营管理", "用户反馈、专家工作台、模型/业务/资源看板、用户与智能体画像、智能体管理、运营概括、审核工作台、权限组织、系统监控、Token 统计。", "汇聚应用状态、使用效果、反馈信息和治理动作，是智能体全生命周期管理中枢。"],
            ["智能体开发", "智能体中心、能力网关、组件中心、工作流、工具、MCP 广场、智能体组件、Skills 中心、提示词工程、知识库接入、模型和凭证配置。", "负责把底层能力编排为业务应用，并向运营管理同步配置摘要、版本状态和运行信息。"],
            ["知识库", "知识检索、历史检索、个人知识库、公共知识库、知识库模型配置。", "支撑用户问答引用和智能体知识挂载，承接知识缺失、引用错误、内容更新等优化需求。"],
            ["模型协同", "基础模型、数据集、权重切分、微调任务、模型部署、模型路由、提供商、基准测试、模型库。", "支撑模型选择、微调评估、效果优化和服务路由，承接效果不足、成本异常等运营反馈。"],
            ["资源服务", "节点、GPU、推理后端、模型文件、集群、API 密钥、访问控制。", "保障推理、训练和部署资源可纳管、可调度、可计量，为稳定性和成本治理提供依据。"],
            ["系统治理", "单位、部门、人员、应用、功能、用户组、角色、数据字典、系统配置、系统监控。", "保障不同角色、应用、知识、模型和资源按授权规范使用，关键操作可审计。"],
            ["智能编码助手", "VS Code 扩展、代码补全、Plan/Ask/Debug/Code 模式、MCP 工具调用、技能/规则、LLM Trace、多模型自托管。", "提升平台建设、二次开发和内部工程协作效率，是面向研发人员的 AI 能力入口。"],
        ],
        [2.7, 6.5, 7.4],
    )
    add_para(doc, "运营模式采用“建设 - 发布 - 使用 - 监控 - 反馈 - 优化”的双向闭环机制。智能体上线后，用户端产生的会话、知识引用、反馈、用量和满意度数据，经运营管理平台汇聚后形成看板、专家任务和优化工单，再回流至智能体开发、知识库、模型协同、资源服务和系统治理等责任平台。")
    add_bullets(
        doc,
        [
            "业务部门或创建者在运营管理平台发起智能体创建，形成统一档案、负责人、可见范围和状态记录。",
            "智能体开发平台承接配置，完成提示词、工作流、工具、MCP、Skills、知识库、模型档位和凭证等编排。",
            "运营管理平台完成发布审核、展示信息确认、权限范围控制和上线后的运行监控。",
            "用户端使用过程中产生反馈、引用、调用、耗时、失败率、Token 和成本等数据。",
            "运营侧通过用户反馈和专家工作台形成处理任务，推动知识补充、模型评估、资源排查、权限修正和配置优化。",
        ]
    )

    add_heading(doc, "三、平台设计理念与核心能力")
    add_para(doc, "敖钦 AI 中台的设计重点，是把分散的模型、知识、资源、工具和应用配置统一收束到智能体生命周期中，并通过运营治理持续观察效果、发现问题、推动优化。")
    add_table(
        doc,
        ["理念", "含义"],
        [
            ["运营中枢", "运营管理平台持续跟踪应用效果、处理反馈、管理审核和权限，并推动问题闭环；海能平台智能体、自建智能体和第三方能力统一纳入运营视野。"],
            ["智能体为核心", "工具、任务链、工作流、MCP、Skills、知识库、模型、权限、日志、反馈和计量均围绕智能体展开，避免资源割裂。"],
            ["建设与运营分工", "开发侧侧重能力编排、调试和运行对接；运营侧侧重状态控制、审核展示、反馈处理、看板分析和治理复盘。"],
            ["底座能力纳管", "模型、知识、算力、API 密钥、凭证、集群和推理后端不只是底层资源，也通过平台进入可配置、可监控、可审计、可计量的管理体系。"],
            ["数据驱动持续优化", "依靠使用数据、反馈数据、专家结论、知识引用、模型评估、资源计量和审计日志推动应用及底层能力持续迭代。"],
        ],
        [3.2, 13.2],
    )
    add_table(
        doc,
        ["能力类别", "主要能力"],
        [
            ["用户端使用能力", "智能体搜索、分类、收藏、最近使用、对话、知识检索、引用查看、文件结果、反馈提交。"],
            ["智能体应用建设", "智能体创建、提示词配置、模型档位选择、任务链编排、工作流配置、工具与 MCP 服务接入、Skills 配置、知识库挂载、预览调试、发布申请。"],
            ["能力与组件管理", "能力网关、组件中心、智能体组件、工作流节点、工具、MCP 广场、Skills 中心、提示词模板与提示词框架。"],
            ["知识库能力", "知识检索、历史检索、个人知识库、公共知识库、知识库模型配置、知识缺失补充、引用质量优化。"],
            ["模型协同能力", "基础模型管理、数据集管理、权重切分方案、微调任务、模型部署、模型路由、提供商、基准测试、模型库。"],
            ["资源服务能力", "节点、GPU、推理后端、模型文件、集群、访问控制、API 密钥、资源计量和容量治理。"],
            ["运营治理能力", "智能体列表、状态管理、可见范围、发布审核、下架治理、第三方智能体接入、运行摘要、用户反馈、专家任务、处理记录。"],
            ["运营看板能力", "模型看板、业务看板、资源看板、用户与智能体画像，支撑用量、效果、稳定性、成本和问题趋势分析。"],
            ["权限、审计与监控", "单位、部门、人员、角色、菜单、功能、接口、凭证、API Key、系统监控、Token 统计、审计日志。"],
            ["智能编码助手", "VS Code 扩展、代码补全、Plan/Ask/Debug/Code 模式、MCP 工具调用、技能/规则、LLM Trace、多模型自托管。"],
        ],
        [3.8, 12.6],
    )

    add_heading(doc, "四、数据流转、接口规范与治理要求")
    add_para(doc, "系统数据流转主要分为主数据、配置数据、运行数据、反馈数据、计量数据和审计数据。各类数据围绕智能体全生命周期流转，既服务于用户侧体验，也服务于运营侧治理和底座能力优化。")
    add_image(doc, IMG_FLOW, "图 2：全平台业务闭环与数据治理流转图")
    add_table(
        doc,
        ["数据类型", "产生方", "应用方", "数据流向", "治理规范"],
        [
            ["主数据", "运营管理平台", "智能体开发、用户端、系统管理", "运营平台同步至开发平台和用户端", "智能体标识、状态、负责人、可见范围和版本信息需统一，创建、变更、上下架全程留痕。"],
            ["配置数据", "智能体开发平台", "运营管理、运行引擎", "开发平台保存配置，摘要同步至运营平台，详细配置供运行引擎读取", "运营平台保留摘要、风险和发布信息，不替代开发侧配置管理。"],
            ["运行数据", "运行引擎、模型服务、资源服务", "运营看板、模型与资源服务", "调用触发后按事件或批量方式上报", "支持按智能体、用户、时间、模型档位、调用链路追踪耗时、失败率和服务稳定性。"],
            ["反馈数据", "用户端、运营管理、专家工作台", "运营管理、知识库、模型协同、资源服务、系统治理", "用户提交后进入反馈列表和专家任务，处理结论回流责任平台", "反馈需关联会话、智能体、问题类型、处理人和工单，确保问题可追溯、可关闭、可复盘。"],
            ["计量数据", "海能底座、运行引擎、资源服务", "运营管理、资源看板、成本治理部门", "计量数据汇总至运营与资源看板", "Token、耗时、失败率、费用估算、GPU/节点资源占用需口径一致，支撑成本治理。"],
            ["审计数据", "系统管理、运营平台、开发平台", "安全审计、系统管理、运营治理", "关键操作实时记录", "发布、下架、权限、API Key、凭证、第三方接入、系统配置变更必须留痕。"],
        ],
        [2.4, 3.0, 3.0, 4.2, 4.2],
    )
    add_para(doc, "接口规范上，建议将“业务操作、配置同步、运行上报、反馈工单、计量审计”分开管理：业务操作保证状态一致，配置同步保证应用可运行，运行上报保证监控可见，反馈工单保证问题闭环，计量审计保证成本和安全可追踪。")

    add_heading(doc, "五、权限控制、功能边界与业务串联")
    add_para(doc, "权限控制机制需要同时覆盖组织身份、角色菜单、应用对象、运行资源和审计计量五个层级，确保用户能看到什么、能使用什么、能配置什么、能调用多少资源以及关键操作如何追溯都有明确边界。")
    add_table(
        doc,
        ["层级", "控制内容", "作用"],
        [
            ["组织身份层", "单位、部门、人员、租户、团队", "确认用户归属，奠定权限基础，并与组织管理、人员管理、部门管理保持一致。"],
            ["角色菜单层", "角色、菜单、功能权限、后台入口", "控制运营管理、智能体开发、模型协同、知识库、系统管理等入口的可见性与操作权限。"],
            ["应用对象层", "智能体、知识库、工具、MCP、Skills 的可用范围", "决定用户能看到和使用哪些具体应用和能力资产，支持私有、部门共享、公开等可见范围。"],
            ["运行资源层", "模型档位、API Key、凭证、资源配额、GPU/节点/集群", "限制 API 调用、算力分配、推理部署和运行成本，避免资源被无序占用。"],
            ["审计计量层", "审核记录、配置变更、调用日志、Token 分析、系统监控", "提供事后审计、成本分析、问题追踪和服务复盘支撑。"],
        ],
        [3.0, 6.0, 7.4],
    )
    add_para(doc, "功能边界上，运营管理平台负责状态控制、审核发布、展示、反馈、看板和治理复盘；智能体开发平台负责提示词、工作流、工具、MCP、Skills、知识库和模型等具体编排；知识库、模型协同、资源服务、系统管理分别承接专业能力优化和底层治理。")
    add_bullets(
        doc,
        [
            "配置缺陷：回流至智能体开发平台，优化提示词、工作流、工具、MCP 或 Skills 接入。",
            "知识缺失：回流至知识库，补充文档、修正引用来源、优化个人/公共知识库内容。",
            "效果不足：回流至模型协同，进行模型评估、数据集补充、微调任务或模型路由调整。",
            "性能延迟：回流至资源服务，排查推理后端、GPU/节点、部署队列、集群负载和容量瓶颈。",
            "权限异常：回流至系统治理，调整组织、角色、功能、接口、API Key 和凭证授权。",
        ]
    )

    add_heading(doc, "六、总体建设目标、当前进度与后续规划")
    add_heading(doc, "6.1 总体建设目标", 2)
    add_bullets(
        doc,
        [
            "形成统一的 AI 应用建设入口，让智能体、工作流、工具、MCP、Skills、提示词、知识库和模型能力可配置、可发布、可复用。",
            "形成统一的运营治理入口，让智能体上线后的状态、权限、反馈、专家处理、运行效果、成本和审计信息可持续管理。",
            "形成统一的能力纳管体系，让知识、模型、算力、API Key、系统权限和智能编码助手服务于平台整体建设，而不是分散存在。",
            "形成统一的数据闭环，让用户反馈、运行指标、知识引用、模型效果和资源计量共同驱动后续优化。",
        ]
    )
    add_heading(doc, "6.2 当前平台已具备能力", 2)
    add_table(
        doc,
        ["方向", "已具备能力"],
        [
            ["运营管理", "已具备用户反馈、专家工作台、模型看板、业务看板、资源看板、用户与智能体画像、智能体管理、运营概括、审核工作台、开发者与权限管理、系统监控、Token 统计等入口。"],
            ["智能体开发", "已具备智能体中心、能力网关、组件中心、工作流、工具、MCP 广场、智能体组件、Skills 中心、提示词工程、知识库接入、模型管理、凭证管理、标签管理和工作流节点管理等入口。"],
            ["模型与资源", "已具备基础模型、数据集、微调任务、模型部署、模型路由、提供商、基准测试、节点、GPU、推理后端、模型文件、集群和 API 密钥等能力入口。"],
            ["知识库", "已具备知识检索、历史检索、个人知识库、公共知识库和知识库模型配置等入口。"],
            ["智能编码助手", "已具备 VS Code 扩展、自动补全、Plan/Ask/Debug/Code 工作模式、MCP 工具调用、技能/规则和模型调用记录等能力说明。"],
        ],
        [3.2, 13.2],
    )
    add_heading(doc, "6.3 后续建设重点", 2)
    add_bullets(
        doc,
        [
            "完善用户端与运营端的反馈闭环，将用户问题、专家处理、知识更新、模型优化和资源排查形成更清晰的工单链路。",
            "完善智能体全生命周期管理，强化创建、配置、审核、上线、使用、监控、下架和复盘的一致状态口径。",
            "完善模型、知识和资源的治理看板，增强成本、质量、稳定性和使用效果的量化评估能力。",
            "完善权限与审计策略，确保组织、角色、应用、知识、模型、API Key 和资源调用都有明确授权边界。",
            "完善面向业务部门的运营报告，让平台价值从“功能可见”进一步转化为“效果可证、问题可闭环、成本可治理”。",
        ]
    )
    add_heading(doc, "6.4 面向甲方的价值总结", 2)
    add_para(doc, "敖钦 AI 中台的核心价值，在于把 AI 能力从单点工具升级为可建设、可运营、可治理、可持续优化的平台体系。对甲方而言，平台不仅能支撑智能体上线使用，更能持续回答“谁在用、用得怎样、问题在哪、谁来处理、成本多少、如何优化”等管理问题。")
    add_para(doc, "通过用户端、智能体开发、运营管理、知识库、模型协同、资源服务、系统治理和智能编码助手的协同，平台能够同时服务普通用户、业务运营人员、开发配置人员、专家处理人员和系统管理员，最终形成面向单位内部 AI 应用建设和治理的统一能力底座。")

    doc.core_properties.title = "敖钦 AI 中台总体建设方案_优化版"
    doc.core_properties.subject = "AI 中台总体能力、运营治理、业务闭环与数据治理"
    doc.core_properties.comments = "Generated by Codex based on current platform observation; original file preserved."
    doc.save(OUT_DOCX)


def verify_outputs() -> None:
    if not OUT_DOCX.exists():
        raise SystemExit("Output docx was not created")
    for path in [IMG_OVERVIEW, IMG_FLOW]:
        if not path.exists():
            raise SystemExit(f"Missing diagram: {path}")
        with Image.open(path) as im:
            if im.width < 2000 or im.height < 1200:
                raise SystemExit(f"Diagram not high resolution enough: {path} {im.size}")
    doc = Document(OUT_DOCX)
    text = "\n".join(p.text for p in doc.paragraphs)
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                text += "\n" + cell.text
    required = [
        "运营管理", "智能体开发", "模型协同", "知识库", "智能编码助手",
        "用户反馈", "专家工作台", "模型看板", "业务看板", "资源看板",
        "权限", "系统监控", "Token 统计", "MCP", "Skills",
    ]
    missing = [item for item in required if item not in text]
    if missing:
        raise SystemExit(f"Missing required coverage: {missing}")
    forbidden = [
        ".9p812na,0ajs", "油气智能体(勿删)", "AI写作帮手", "测试配置页",
        "周报(新_公司范围)", "办公智能体(测试)", "大Y的智能体", "短视频文案策划（测试）",
    ]
    found = [item for item in forbidden if item in text]
    if found:
        raise SystemExit(f"Forbidden sensitive/test content found: {found}")
    print(f"OK: {OUT_DOCX}")
    print(f"OK: {IMG_OVERVIEW}")
    print(f"OK: {IMG_FLOW}")
    print(f"Paragraphs: {len(doc.paragraphs)} Tables: {len(doc.tables)} InlineShapes: {len(doc.inline_shapes)}")


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    make_overview()
    make_flow()
    make_doc()
    verify_outputs()


if __name__ == "__main__":
    main()
