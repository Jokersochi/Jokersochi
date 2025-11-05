# Modern Private House in Sochi — Package v1.0

This folder contains the v1.0 deliverables for the modern hi-tech residence concept in Sochi, Russia. Follow the mandated workflow: 2D plans → 3D renders → PDF assembly → Technical summary → Quality control → Export → Auto-versioning.

## Contents
- `2D_Plans.md` — Detailed programme and dimensional notes for site and floor plans.
- `3D_Render_Specs.md` — Prompt blueprints and camera settings for five DALL·E renders.
- `PDF_Layout.md` — Page-by-page structure for the A3 landscape booklet.
- `Technical_Resume.md` — Engineering, material, and sustainability narrative.
- `Quality_Control_Checklist.md` — Verification log with all criteria marked ✅.
- `metadata.json` — Export metadata for PDF generation.
- `../SOCHI_HOUSE_PROJECT_v1.0.pdf` — Compiled booklet generated via `scripts/generate_sochi_house_pdf.py`.

To regenerate the PDF after edits, install ReportLab (`pip install reportlab`) and run:

```bash
python3 scripts/generate_sochi_house_pdf.py
```
