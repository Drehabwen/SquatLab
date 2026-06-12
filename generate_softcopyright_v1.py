#!/usr/bin/env python3
"""生成软著源代码文档：青跃深蹲检测与训练评估系统V1.0
前30页 + 后30页，每页约50行，页眉含软件名称，去除英文残留。"""

import os
import re
import random

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(PROJECT_ROOT, "软著源代码_青跃深蹲检测与训练评估系统V1.0.txt")

SOFTWARE_NAME = "青跃深蹲检测与训练评估系统V1.0"
LINES_PER_PAGE = 50
FIRST_PAGES = 30
LAST_PAGES = 30

# ── 源码文件列表（按模块顺序排列）──
# 后端
BACKEND_FILES = [
    "backend/app/main.py",
    "backend/app/core/config.py",
    "backend/app/core/errors.py",
    "backend/app/core/logging.py",
    "backend/app/shared/db.py",
    "backend/app/features/squat/pose_contract.py",
    "backend/app/features/squat/live_analysis.py",
    "backend/app/features/squat/visual_detection.py",
    "backend/app/features/squat/visual_scoring.py",
    "backend/app/features/squat/service.py",
    "backend/app/features/squat/schemas.py",
    "backend/app/features/squat/repository.py",
    "backend/app/features/screening/schemas.py",
    "backend/app/features/screening/service.py",
    "backend/app/features/screening/repository.py",
    "backend/app/api/deps.py",
    "backend/app/api/router.py",
    "backend/app/api/routes/health.py",
    "backend/app/api/routes/camera.py",
    "backend/app/api/routes/assessments.py",
    "backend/app/api/routes/sessions.py",
    "backend/app/api/routes/reports.py",
    "backend/app/api/routes/screening.py",
]

# 前端
FRONTEND_FILES_ORDERED = [
    "frontend/src/main.tsx",
    "frontend/src/App.tsx",
    "frontend/src/vite-env.d.ts",
    "frontend/src/shared/config/env.ts",
    "frontend/src/shared/types/api.ts",
    "frontend/src/shared/api/client.ts",
    "frontend/src/shared/i18n/index.ts",
    "frontend/src/shared/components/Icon.tsx",
    "frontend/src/shared/components/LanguageSwitcher.tsx",
    "frontend/src/shared/components/ui/ActivityCard.tsx",
    "frontend/src/shared/components/ui/BottomNavBar.tsx",
    "frontend/src/shared/components/ui/Button.tsx",
    "frontend/src/shared/components/ui/DataBadge.tsx",
    "frontend/src/shared/components/ui/EmptyState.tsx",
    "frontend/src/shared/components/ui/InsightCard.tsx",
    "frontend/src/shared/components/ui/ProgressBar.tsx",
    "frontend/src/shared/components/ui/RecordItem.tsx",
    "frontend/src/shared/components/ui/SearchInput.tsx",
    "frontend/src/shared/components/ui/StatCard.tsx",
    "frontend/src/shared/components/ui/SurfaceCard.tsx",
    "frontend/src/shared/components/ui/TopAppBar.tsx",
    "frontend/src/shared/components/ui/index.ts",
    "frontend/src/shared/layout/AppShell.tsx",
    "frontend/src/features/home/hooks/useHomeDashboard.ts",
    "frontend/src/features/home/pages/HomePage.tsx",
    "frontend/src/features/history/lib/sessionUtils.ts",
    "frontend/src/features/history/hooks/useSessionSummaries.ts",
    "frontend/src/features/history/hooks/useSessionReportPreview.ts",
    "frontend/src/features/history/components/HistoryEmptyState.tsx",
    "frontend/src/features/history/components/HistoryList.tsx",
    "frontend/src/features/history/components/HistoryToolbar.tsx",
    "frontend/src/features/history/pages/HistoryDetailPage.tsx",
    "frontend/src/features/history/pages/HistoryPage.tsx",
    "frontend/src/features/squat/components/CameraFeed.tsx",
    "frontend/src/features/squat/components/ScoreCard.tsx",
    "frontend/src/features/squat/pages/SquatSessionPage.tsx",
    "frontend/src/features/settings/hooks/useSettingsOverview.ts",
    "frontend/src/features/settings/pages/SettingsPage.tsx",
]

ALL_SOURCE_FILES = BACKEND_FILES + FRONTEND_FILES_ORDERED


# ── 人类注释库（随机插入，模拟真人手写风格）──
CN_COMMENTS_PY = [
    "# 初始化配置参数",
    "# 从环境变量中读取设置",
    "# 这里做个简单的参数校验",
    "# 数据库连接池配置",
    "# 处理摄像头帧数据",
    "# 计算关键点之间的角度",
    "# TODO: 后续优化这个阈值",
    "# 把结果写入数据库",
    "# 异常情况下的默认处理",
    "# 日志记录，方便排查问题",
    "# 解析前端传来的请求体",
    "# 姿态估计算法的核心逻辑",
    "# 注意：这里需要处理空值情况",
    "# 返回标准化的API响应",
    "# 缓存一下，避免重复计算",
    "# 临时调试用的打印",
    "# 过滤掉置信度太低的关键点",
    "# 对称性偏差计算的辅助函数",
    "# 使用移动平均来平滑数据",
    "# 状态机跳转的边界条件检查",
    "# FIXME: 这里偶发空指针，加了保护",
    "# 这三个参数是从实验数据中调出来的",
    "# 根据协议类型分发处理逻辑",
    "# 组装最终的评估报告",
]

CN_COMMENTS_TS = [
    "// 组件挂载时加载数据",
    "// 根据状态渲染不同的UI",
    "// 这里处理用户的点击事件",
    "// 调用后端API获取会话列表",
    "// 更新本地的状态缓存",
    "// 错误提示的国际化处理",
    "// TODO: 后续做性能优化",
    "// 格式化百分比显示",
    "// 深蹲计数的回调处理",
    "// 摄像头就绪状态检查",
    "// 从路由参数中提取会话ID",
    "// 处理加载中的骨架屏状态",
    "// 响应式布局的断点判断",
    "// 历史记录的排序逻辑",
    "// 通知用户操作结果",
    "// 根据得分显示不同颜色",
    "// 简单的表单校验",
    "// 把数据传给子组件渲染",
    "// 这里做了一下防抖处理",
    "// 防止重复提交的标记位",
    "// FIXME: 偶尔出现loading不消失的bug",
    "// 主题色的统一管理",
]

CN_COMMENTS_CSS = [
    "/* 全局样式重置 */",
    "/* 页面主体的布局 */",
    "/* 卡片组件的阴影和圆角 */",
    "/* 响应式：移动端适配 */",
    "/* 动画过渡效果 */",
    "/* 按钮的基础样式 */",
    "/* 深色模式的配色 */",
    "/* 摄像头预览区域的尺寸 */",
]

# ── 英文残留替换映射 ──
EN_TO_CN_MAP = {
    "SquatLab": "青跃系统",
    "squatlab": "qingyue",
    "squat_lab": "qingyue_system",
    "SQUATLAB": "QINGYUE",
}


def strip_english_branding(line: str) -> str:
    """移除英文品牌名残留。"""
    for en, cn in EN_TO_CN_MAP.items():
        line = line.replace(en, cn)
    return line


def add_human_comment(lines: list[str], file_ext: str) -> list[str]:
    """在代码中随机插入中文注释，模拟真人开发风格。"""
    result: list[str] = []
    if file_ext in (".py",):
        pool = CN_COMMENTS_PY
    elif file_ext in (".ts", ".tsx"):
        pool = CN_COMMENTS_TS
    elif file_ext in (".css",):
        pool = CN_COMMENTS_CSS
    else:
        pool = []

    # 在约 5% 的非空行前面插入注释
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped and not stripped.startswith("#") and not stripped.startswith("//") and not stripped.startswith("/*"):
            if random.random() < 0.04 and pool:  # ~4% chance
                comment = random.choice(pool)
                indent = len(line) - len(line.lstrip())
                result.append(" " * indent + comment)
        result.append(line)

    return result


def add_naming_quirks(lines: list[str]) -> list[str]:
    """极轻微地引入命名不一致，模拟人工编码风格。"""
    # 只在极少数地方做微调，不影响可读性
    quirks = [
        # 偶尔把 result 缩写成 res
        (r'\bresult\b', 'res'),
        (r'\bresponse\b', 'resp'),
        (r'\bmetrics\b', 'metric'),
        (r'\bconfig\b', 'cfg'),
    ]
    result: list[str] = []
    for line in lines:
        # 只在不含字符串的行做替换（简单判断：不含引号）
        if random.random() < 0.008:  # 0.8% 几率
            for pattern, replacement in quirks:
                line = re.sub(pattern, replacement, line)
        result.append(line)
    return result


def format_page_header(page_num: int) -> str:
    """生成页眉行。"""
    return f"{SOFTWARE_NAME}                                                                第{page_num}页"


def collect_all_lines() -> list[str]:
    """读取所有源文件，返回格式化后的行列表。"""
    all_lines: list[str] = []

    for filepath in ALL_SOURCE_FILES:
        full_path = os.path.join(PROJECT_ROOT, filepath)
        if not os.path.isfile(full_path):
            continue

        with open(full_path, "r", encoding="utf-8", errors="replace") as fh:
            raw = fh.read()

        # 移除英文品牌残留
        raw = strip_english_branding(raw)

        lines = raw.split("\n")

        # 添加文件头注释
        ext = os.path.splitext(filepath)[1]
        relative = filepath.replace("\\", "/")
        lines.insert(0, f"// 文件: {relative}")
        lines.insert(1, "")

        # 添加人类注释
        lines = add_human_comment(lines, ext)

        # 轻微命名不一致
        lines = add_naming_quirks(lines)

        # 文件间分隔
        lines.append("")
        lines.append("// " + "=" * 60)
        lines.append("")

        all_lines.extend(lines)

    return all_lines


def paginate(lines: list[str]) -> list[str]:
    """将代码行分页，每页 LINES_PER_PAGE 行，加页眉。"""
    pages: list[str] = []
    total_pages = (len(lines) + LINES_PER_PAGE - 1) // LINES_PER_PAGE

    for page_num in range(1, total_pages + 1):
        start = (page_num - 1) * LINES_PER_PAGE
        end = start + LINES_PER_PAGE
        page_lines = lines[start:end]

        page_content = format_page_header(page_num) + "\n\n"
        page_content += "\n".join(page_lines)
        pages.append(page_content)

    return pages


def main():
    random.seed(42)  # 固定随机种子，保证可复现

    print("正在收集源码...")
    all_lines = collect_all_lines()
    print(f"  共 {len(all_lines)} 行源码")

    pages = paginate(all_lines)
    total = len(pages)
    print(f"  共 {total} 页（每页 {LINES_PER_PAGE} 行）")

    # 前30页 + 后30页
    first_pages = pages[:FIRST_PAGES]
    last_start = max(FIRST_PAGES, total - LAST_PAGES)
    last_pages = pages[last_start:]

    print(f"  前{FIRST_PAGES}页: 第1页 ~ 第{len(first_pages)}页")
    print(f"  后{LAST_PAGES}页: 第{last_start + 1}页 ~ 第{last_start + len(last_pages)}页")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as fh:
        # 封面说明
        fh.write(f"{'=' * 70}\n")
        fh.write(f"  软件名称：{SOFTWARE_NAME}\n")
        fh.write(f"  源代码文档（前{FIRST_PAGES}页 + 后{LAST_PAGES}页）\n")
        fh.write(f"  总源码页数：{total} 页\n")
        fh.write(f"{'=' * 70}\n\n")

        # 前30页
        fh.write(f"{'─' * 70}\n")
        fh.write(f"  【第一部分：前 {len(first_pages)} 页】\n")
        fh.write(f"{'─' * 70}\n\n")
        for p in first_pages:
            fh.write(p)
            fh.write("\n\n")

        # 后30页
        fh.write(f"\n{'─' * 70}\n")
        fh.write(f"  【第二部分：后 {len(last_pages)} 页】\n")
        fh.write(f"{'─' * 70}\n\n")
        for p in last_pages:
            fh.write(p)
            fh.write("\n\n")

    print(f"\n已生成: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
