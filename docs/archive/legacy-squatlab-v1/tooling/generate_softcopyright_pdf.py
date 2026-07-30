#!/usr/bin/env python3
"""Generate software copyright source code PDF for 青跃智衡 — AI姿态与动作筛查系统 V2.0
   Standard: first 30 pages + last 30 pages = 60 pages
   Uses self-calibrating two-pass approach for correct page numbering.
"""

from pathlib import Path
from fpdf import FPDF

PROJECT_ROOT = Path(__file__).resolve().parent
SOFTWARE_NAME = "青跃智衡 — AI姿态与动作筛查系统 V2.0"
FONT_PATH = "C:/Windows/Fonts/simhei.ttf"

ALL_FILES = [
    "backend/app/features/squat/visual_scoring.py",
    "backend/app/features/squat/live_analysis.py",
    "backend/app/features/squat/visual_detection.py",
    "backend/app/features/squat/service.py",
    "backend/app/features/squat/repository.py",
    "backend/app/features/squat/schemas.py",
    "backend/app/features/squat/pose_contract.py",
    "backend/app/features/screening/service.py",
    "backend/app/features/screening/repository.py",
    "backend/app/features/screening/schemas.py",
    "backend/app/api/routes/camera.py",
    "backend/app/api/routes/assessments.py",
    "backend/app/api/routes/screening.py",
    "backend/app/api/routes/reports.py",
    "backend/app/api/routes/sessions.py",
    "backend/app/api/routes/health.py",
    "backend/app/api/router.py",
    "backend/app/api/deps.py",
    "backend/app/main.py",
    "backend/app/core/config.py",
    "backend/app/core/errors.py",
    "backend/app/core/logging.py",
    "backend/app/shared/db.py",
    "frontend/src/features/squat/components/CameraFeed.tsx",
    "frontend/src/features/squat/pages/SquatSessionPage.tsx",
    "frontend/src/features/squat/components/ScoreCard.tsx",
    "frontend/src/shared/api/client.ts",
    "frontend/src/shared/types/api.ts",
    "frontend/src/App.tsx",
    "frontend/src/main.tsx",
    "frontend/src/features/home/pages/HomePage.tsx",
    "frontend/src/features/home/hooks/useHomeDashboard.ts",
    "frontend/src/features/history/pages/HistoryPage.tsx",
    "frontend/src/features/history/pages/HistoryDetailPage.tsx",
    "frontend/src/features/history/components/HistoryList.tsx",
    "frontend/src/features/history/components/HistoryToolbar.tsx",
    "frontend/src/features/history/components/HistoryEmptyState.tsx",
    "frontend/src/features/history/hooks/useSessionSummaries.ts",
    "frontend/src/features/history/hooks/useSessionReportPreview.ts",
    "frontend/src/features/history/lib/sessionUtils.ts",
    "frontend/src/features/settings/pages/SettingsPage.tsx",
    "frontend/src/features/settings/hooks/useSettingsOverview.ts",
    "frontend/src/shared/layout/AppShell.tsx",
    "frontend/src/shared/components/Icon.tsx",
    "frontend/src/shared/components/LanguageSwitcher.tsx",
    "frontend/src/shared/components/ui/index.ts",
    "frontend/src/shared/components/ui/Button.tsx",
    "frontend/src/shared/components/ui/TopAppBar.tsx",
    "frontend/src/shared/components/ui/BottomNavBar.tsx",
    "frontend/src/shared/components/ui/SurfaceCard.tsx",
    "frontend/src/shared/components/ui/StatCard.tsx",
    "frontend/src/shared/components/ui/ProgressBar.tsx",
    "frontend/src/shared/components/ui/RecordItem.tsx",
    "frontend/src/shared/components/ui/SearchInput.tsx",
    "frontend/src/shared/components/ui/ActivityCard.tsx",
    "frontend/src/shared/components/ui/EmptyState.tsx",
    "frontend/src/shared/components/ui/InsightCard.tsx",
    "frontend/src/shared/components/ui/DataBadge.tsx",
    "frontend/src/shared/config/env.ts",
    "frontend/src/shared/i18n/index.ts",
]

OUTPUT_DIR = PROJECT_ROOT / "docs"
OUTPUT_PATH = OUTPUT_DIR / "软著源代码文档.pdf"

CODE_FONT_SIZE = 7.2
LINE_HEIGHT = 4.0
HEADER_FONT_SIZE = 8
TOTAL_TARGET_PAGES = 60


class CodePDF(FPDF):
    def __init__(self):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.set_auto_page_break(True, 10)
        self.add_font("CJK", "", FONT_PATH)
        self.add_page()

    def header(self):
        self.set_font("CJK", "", HEADER_FONT_SIZE)
        page_str = str(self.page_no())
        name_w = self.w - self.l_margin - self.r_margin - 10
        self.cell(name_w, 5, SOFTWARE_NAME, align="L")
        self.cell(0, 5, page_str, align="R", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(170, 170, 170)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(1.5)


def read_source(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except Exception:
        return ""


def count_output_lines(project: Path, file_list: list[str]) -> int:
    """Count lines exactly as they would appear in PDF output."""
    total = 0
    for rel_path in file_list:
        full_path = project / rel_path
        if not full_path.exists():
            continue
        content = read_source(full_path)
        lines = content.split("\n")
        while lines and not lines[0].strip():
            lines.pop(0)
        while lines and not lines[-1].strip():
            lines.pop()
        if not lines:
            continue
        total += len(lines)  # code lines
        total += 2           # separator + gap
    return total


def write_files(pdf: CodePDF, project: Path, file_list: list[str], file_limit: int | None = None):
    """Write source files into PDF. Returns (lines_written, files_written)."""
    total_lines = 0
    file_count = 0

    for rel_path in file_list:
        if file_limit is not None and file_count >= file_limit:
            break

        full_path = project / rel_path
        if not full_path.exists():
            continue

        content = read_source(full_path)
        lines = content.split("\n")
        while lines and not lines[0].strip():
            lines.pop(0)
        while lines and not lines[-1].strip():
            lines.pop()
        if not lines:
            continue

        y = pdf.get_y()
        page_h = pdf.h - pdf.b_margin
        if page_h - y < 25:
            pdf.add_page()

        pdf.set_font("CJK", "", 6.5)
        pdf.set_text_color(130, 130, 130)
        short_path = rel_path.replace("backend/app/", "").replace("frontend/src/", "")
        pdf.cell(0, 3.5, f"// {short_path}", new_x="LMARGIN", new_y="NEXT")
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("CJK", "", CODE_FONT_SIZE)

        for line in lines:
            display_line = line.replace("\t", "    ")
            if len(display_line) > 108:
                display_line = display_line[:108]
            pdf.cell(0, LINE_HEIGHT, display_line, new_x="LMARGIN", new_y="NEXT")
            total_lines += 1

        pdf.ln(1.2)
        file_count += 1

    return total_lines, file_count


def calibrate_lines_per_page(project: Path) -> float:
    """Quick first pass: write a sample of files to determine lines/page ratio."""
    pdf = CodePDF()
    pdf.set_margin(11)
    pdf.set_font("CJK", "", CODE_FONT_SIZE)

    sample_files = ALL_FILES[:12]  # first ~30% of content
    lines_written, _ = write_files(pdf, project, sample_files)
    pages = pdf.pages_count
    return lines_written / pages if pages > 0 else 65


def generate_pdf():
    project = PROJECT_ROOT
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # ── Calibrate ──
    lpp = calibrate_lines_per_page(project)
    print(f"Calibrated lines/page: {lpp:.1f}")

    # ── Determine which files go into front/back sections ──
    total_lines = count_output_lines(project, ALL_FILES)
    total_est_pages = total_lines / lpp
    print(f"Total lines: {total_lines}, estimated pages: {total_est_pages:.1f}")

    if total_est_pages <= TOTAL_TARGET_PAGES:
        # All code fits in 60 pages
        print("All content fits in 60 pages, outputting everything.")
        pdf = CodePDF()
        pdf.set_margin(11)
        pdf.set_font("CJK", "", CODE_FONT_SIZE)
        write_files(pdf, project, ALL_FILES)
        pdf.output(str(OUTPUT_PATH))
        print(f"Done: {pdf.pages_count} pages")
        return

    # ── Split into front and back sections ──
    front_target = int(30 * lpp)  # ~30 pages
    back_target = int(28 * lpp)   # adjusted to hit 60 total

    # Front section: accumulate files from beginning until target exceeded
    front_files = []
    front_lines = 0
    for rel_path in ALL_FILES:
        full_path = project / rel_path
        if not full_path.exists():
            continue
        content = read_source(full_path)
        lines = content.split("\n")
        while lines and not lines[0].strip():
            lines.pop(0)
        while lines and not lines[-1].strip():
            lines.pop()
        if not lines:
            continue
        file_lines = len(lines) + 2
        front_files.append(rel_path)
        front_lines += file_lines
        if front_lines >= front_target:
            break

    # Back section: accumulate files from end until target exceeded
    back_files = []
    back_lines = 0
    for rel_path in reversed(ALL_FILES):
        if rel_path in front_files:
            continue
        full_path = project / rel_path
        if not full_path.exists():
            continue
        content = read_source(full_path)
        lines = content.split("\n")
        while lines and not lines[0].strip():
            lines.pop(0)
        while lines and not lines[-1].strip():
            lines.pop()
        if not lines:
            continue
        file_lines = len(lines) + 2
        back_files.insert(0, rel_path)
        back_lines += file_lines
        if back_lines >= back_target:
            break

    print(f"Front: {len(front_files)} files, ~{front_lines} lines")
    print(f"Back:  {len(back_files)} files, ~{back_lines} lines")

    # ── Generate final PDF with continuous page numbers ──
    pdf = CodePDF()
    pdf.set_margin(11)
    pdf.set_font("CJK", "", CODE_FONT_SIZE)

    fl, _ = write_files(pdf, project, front_files)
    bl, _ = write_files(pdf, project, back_files)

    pdf.output(str(OUTPUT_PATH))
    print(f"Done: {pdf.pages_count} pages, {fl + bl} lines")
    print(f"Output: {OUTPUT_PATH}")


if __name__ == "__main__":
    generate_pdf()
