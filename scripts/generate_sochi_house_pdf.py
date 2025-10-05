#!/usr/bin/env python3
"""Generate SOCHI_HOUSE_PROJECT_v1.0.pdf using ReportLab."""

import json
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A3, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[1] / "SOCHI_HOUSE_PROJECT" / "v1.0"
OUTPUT = ROOT.parents[0] / "SOCHI_HOUSE_PROJECT_v1.0.pdf"

WOOD = colors.HexColor("#C89B6A")
SKY = colors.HexColor("#5BA7D1")


def load_text(name: str) -> str:
    path = ROOT / name
    return path.read_text(encoding="utf-8")


def load_metadata() -> dict:
    meta_path = ROOT / "metadata.json"
    with meta_path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def make_paragraph(text: str, style: ParagraphStyle):
    return Paragraph(text.replace("\n", "<br/>"), style)


def build_pdf():
    metadata = load_metadata()
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=landscape(A3),
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
        title=f"{metadata['project_name']} — {metadata['version']}",
        author=metadata["author"],
        subject="Architectural Concept Package",
    )

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="CoverTitle", fontName="Helvetica-Bold", fontSize=32, leading=38))
    styles.add(ParagraphStyle(name="Subtitle", fontName="Helvetica", fontSize=16, leading=20))
    styles.add(ParagraphStyle(name="Heading", fontName="Helvetica-Bold", fontSize=20, leading=24, textColor=WOOD))
    styles.add(ParagraphStyle(name="Body", fontName="Helvetica", fontSize=11, leading=14))
    styles.add(ParagraphStyle(name="Small", fontName="Helvetica-Oblique", fontSize=9, leading=12, textColor=SKY))

    flow = []

    # Cover
    flow.append(make_paragraph("Современный дом в Сочи / ChatGPT-5 Architect", styles["CoverTitle"]))
    flow.append(Spacer(1, 12))
    cover_meta = (
        f"Location: Sochi, Russia<br/>"
        f"Scale: {metadata['scale']}<br/>"
        f"Version: {metadata['version']}<br/>"
        f"Date: {metadata['created']}"
    )
    flow.append(make_paragraph(cover_meta, styles["Subtitle"]))
    flow.append(Spacer(1, 24))

    # Contents
    flow.append(make_paragraph("Содержание", styles["Heading"]))
    contents = "<br/>".join(
        [
            "01 — Генплан (1:200)",
            "02 — План 1 этажа (1:100)",
            "03 — План 2 этажа (1:100)",
            "04 — План 3 этажа (1:100)",
            "05 — Материалы и интерьер",
            "06 — Рендеры 1–5",
            "07 — Техрезюме",
            "08 — Чек-лист качества",
            "09 — Журнал версий",
        ]
    )
    flow.append(make_paragraph(contents, styles["Body"]))
    flow.append(Spacer(1, 18))

    # 2D Plans summary
    flow.append(make_paragraph("2D-планы", styles["Heading"]))
    flow.append(make_paragraph(load_text("2D_Plans.md"), styles["Body"]))
    flow.append(Spacer(1, 18))

    # 3D renders summary
    flow.append(make_paragraph("3D-рендеры", styles["Heading"]))
    flow.append(make_paragraph(load_text("3D_Render_Specs.md"), styles["Body"]))
    flow.append(Spacer(1, 18))

    # Technical resume
    flow.append(make_paragraph("Техническое резюме", styles["Heading"]))
    flow.append(make_paragraph(load_text("Technical_Resume.md"), styles["Body"]))
    flow.append(Spacer(1, 18))

    # QC checklist
    flow.append(make_paragraph("Quality Control", styles["Heading"]))
    flow.append(make_paragraph(load_text("Quality_Control_Checklist.md"), styles["Body"]))
    flow.append(Spacer(1, 18))

    # Revision log table
    rev_log = (ROOT.parents[0] / "Revision_Log.md").read_text(encoding="utf-8")
    flow.append(make_paragraph("Журнал версий", styles["Heading"]))
    flow.append(make_paragraph(rev_log, styles["Body"]))
    flow.append(Spacer(1, 24))

    # Metadata table
    table_data = [
        ["Project Name", metadata["project_name"]],
        ["Version", metadata["version"]],
        ["Author", metadata["author"]],
        ["Scale", metadata["scale"]],
        ["Resolution", metadata["resolution"]],
        ["Software", metadata["software"]],
        ["License", metadata["license"]],
    ]
    table = Table(table_data, colWidths=[50 * mm, 180 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), SKY),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.lightgrey]),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.grey),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.grey),
            ]
        )
    )
    flow.append(table)
    flow.append(Spacer(1, 12))

    flow.append(make_paragraph("Generated via ChatGPT-5 Architect pipeline.", styles["Small"]))

    doc.build(flow)


if __name__ == "__main__":
    try:
        import reportlab  # noqa: F401
    except ModuleNotFoundError as exc:  # pragma: no cover
        raise SystemExit(
            "ReportLab is required. Install with `pip install reportlab`."
        ) from exc
    build_pdf()
