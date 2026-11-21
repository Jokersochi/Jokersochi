"""Read-only frontend contract for the paper-research preview."""
from pathlib import Path

TERMINAL = Path(__file__).resolve().parents[1] / "ui" / "terminal.html"


def test_terminal_stays_read_only_and_paper_first():
    source = TERMINAL.read_text(encoding="utf-8")

    # The preview must not submit orders, accept wallet keys or fabricate metrics.
    assert 'getJson("/health")' in source
    assert 'getJson("/status")' in source
    assert 'DRY_RUN=false' in source
    assert 'Источник не подключён' in source
    assert 'P&amp;L' in source
    assert '<form' not in source.lower()
    assert 'method:"POST"' not in source
    assert 'method: "POST"' not in source
    assert '/orders' not in source
    assert 'private_key' not in source.lower()


def test_terminal_has_responsive_and_accessible_basics():
    source = TERMINAL.read_text(encoding="utf-8")
    assert '<html lang="ru">' in source
    assert 'name="viewport"' in source
    assert 'prefers-reduced-motion' in source
    assert '@media(max-width:650px)' in source
    assert 'aria-live="polite"' in source
    assert 'id="refresh"' in source
