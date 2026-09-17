#!/usr/bin/env python3
"""Непрерывный 24/7-раннер PolyShark для paper-only торговли.

Процесс постоянно работает, выполняет безопасный paper-tick с заданным интервалом,
пишет heartbeat, повторяет попытки после временных ошибок и не включает реальные ордера.
"""
from __future__ import annotations

import argparse
import fcntl
import json
import os
import signal
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import paper_trader as trader

DEFAULT_INTERVAL_SECONDS = max(30, int(os.getenv("PAPER_TICK_INTERVAL_SECONDS", "300")))
RETRY_MIN_SECONDS = max(5, int(os.getenv("PAPER_RETRY_MIN_SECONDS", "15")))
RETRY_MAX_SECONDS = max(RETRY_MIN_SECONDS, int(os.getenv("PAPER_RETRY_MAX_SECONDS", "300")))
CONTINUOUS_TARGET_EQUITY = float(os.getenv("PAPER_CONTINUOUS_TARGET_EQUITY", "1000000000"))

_STOP_REQUESTED = False


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _handle_signal(signum: int, _frame: Any) -> None:
    global _STOP_REQUESTED
    _STOP_REQUESTED = True
    print(f"Получен сигнал {signum}. Завершаю цикл после текущей операции.", flush=True)


def _read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)


def prepare_continuous_state(state: dict[str, Any], target_equity: float) -> dict[str, Any]:
    """Продлевает paper-сессию после достижения прежней цели, не сбрасывая капитал."""
    if target_equity <= 0:
        raise ValueError("PAPER_CONTINUOUS_TARGET_EQUITY должен быть больше нуля")
    state["paper_only"] = True
    state["real_orders_enabled"] = False
    state["target_equity"] = round(target_equity, 2)
    if state.get("status") == "stopped_target" and float(state.get("equity", 0.0) or 0.0) > 0:
        now = utc_now()
        state["status"] = "running"
        state["stopped_at"] = None
        state["stop_reason"] = None
        state.setdefault("audit", []).append(
            {
                "ts": now,
                "event": "SESSION_RESUME_CONTINUOUS",
                "equity": state.get("equity"),
                "target_equity": state["target_equity"],
                "paper_only": True,
            }
        )
    return state


def run_tick(state_path: Path, target_equity: float = CONTINUOUS_TARGET_EQUITY) -> dict[str, Any]:
    """Выполняет один paper-only тик и возвращает сохранённое состояние."""
    trader.TARGET_EQUITY = target_equity
    state = trader.load_state(state_path)
    state = prepare_continuous_state(state, target_equity)
    try:
        state = trader.tick(state)
    except Exception as exc:  # fail-closed: торговых действий после ошибки нет
        state["last_tick_at"] = utc_now()
        state["last_error"] = f"{type(exc).__name__}: {exc}"
        state.setdefault("audit", []).append(
            {"ts": state["last_tick_at"], "event": "TICK_ERROR", "error": state["last_error"]}
        )
    trader.validate_state(state)
    trader.save_state(state_path, state)
    return state


def heartbeat_payload(state: dict[str, Any], *, status: str, consecutive_errors: int, next_tick_in: int) -> dict[str, Any]:
    return {
        "service": "PolyShark paper 24/7",
        "status": status,
        "updated_at": utc_now(),
        "last_tick_at": state.get("last_tick_at"),
        "last_error": state.get("last_error"),
        "consecutive_errors": consecutive_errors,
        "next_tick_in_seconds": max(0, int(next_tick_in)),
        "equity": state.get("equity"),
        "cash": state.get("cash"),
        "open_positions": len(state.get("open_positions", [])),
        "ticks": state.get("ticks"),
        "paper_only": state.get("paper_only") is True,
        "real_orders_enabled": state.get("real_orders_enabled") is True,
    }


def healthcheck(heartbeat_path: Path, max_age_seconds: int) -> int:
    heartbeat = _read_json(heartbeat_path)
    if not heartbeat or heartbeat.get("paper_only") is not True or heartbeat.get("real_orders_enabled") is True:
        print("НЕИСПРАВНО: нет корректного paper-only heartbeat")
        return 1
    updated_at = heartbeat.get("updated_at")
    try:
        updated = datetime.fromisoformat(str(updated_at).replace("Z", "+00:00")).timestamp()
    except (TypeError, ValueError):
        print("НЕИСПРАВНО: некорректное время heartbeat")
        return 1
    age = time.time() - updated
    if age > max_age_seconds:
        print(f"НЕИСПРАВНО: heartbeat устарел на {int(age)} сек.")
        return 1
    print("ИСПРАВНО: paper-only раннер активен")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Непрерывный paper-only раннер PolyShark")
    parser.add_argument("--state", default=str(Path(__file__).with_name("paper_state.json")))
    parser.add_argument("--heartbeat", default=str(Path(__file__).with_name("paper_heartbeat.json")))
    parser.add_argument("--lock", default=str(Path(__file__).with_name("paper_daemon.lock")))
    parser.add_argument("--interval", type=int, default=DEFAULT_INTERVAL_SECONDS)
    parser.add_argument("--once", action="store_true", help="Выполнить один тик и завершиться")
    parser.add_argument("--healthcheck", action="store_true", help="Проверить свежесть heartbeat")
    parser.add_argument("--health-max-age", type=int, default=max(180, DEFAULT_INTERVAL_SECONDS * 3))
    args = parser.parse_args(argv)

    state_path = Path(args.state)
    heartbeat_path = Path(args.heartbeat)
    if args.healthcheck:
        return healthcheck(heartbeat_path, args.health_max_age)

    interval = max(30, int(args.interval))
    lock_path = Path(args.lock)
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    lock_file = lock_path.open("a+", encoding="utf-8")
    try:
        fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        print("Другой экземпляр PolyShark paper-раннера уже работает. Дублирование запрещено.")
        return 2

    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    consecutive_errors = 0
    print(f"PolyShark paper-only 24/7 запущен. Интервал проверки рынка: {interval} сек.", flush=True)

    while not _STOP_REQUESTED:
        started = time.monotonic()
        state = run_tick(state_path)
        error = state.get("last_error")
        if error:
            consecutive_errors += 1
            delay = min(RETRY_MAX_SECONDS, RETRY_MIN_SECONDS * (2 ** min(consecutive_errors - 1, 6)))
            status = "ошибка_ожидание_повтора"
            print(f"Ошибка paper-tick: {error}. Повтор через {delay} сек.", flush=True)
        else:
            consecutive_errors = 0
            elapsed = int(time.monotonic() - started)
            delay = max(1, interval - elapsed)
            status = "работает"
            print(
                json.dumps(
                    {
                        "состояние": state.get("status"),
                        "капитал": state.get("equity"),
                        "деньги": state.get("cash"),
                        "открытых_позиций": len(state.get("open_positions", [])),
                        "тиков": state.get("ticks"),
                        "paper_only": True,
                    },
                    ensure_ascii=False,
                ),
                flush=True,
            )

        _write_json(
            heartbeat_path,
            heartbeat_payload(state, status=status, consecutive_errors=consecutive_errors, next_tick_in=delay),
        )
        if args.once:
            return 1 if error else 0

        deadline = time.monotonic() + delay
        while not _STOP_REQUESTED and time.monotonic() < deadline:
            time.sleep(min(1.0, max(0.0, deadline - time.monotonic())))

    final_state = _read_json(state_path)
    _write_json(
        heartbeat_path,
        heartbeat_payload(final_state, status="остановлен", consecutive_errors=consecutive_errors, next_tick_in=0),
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
