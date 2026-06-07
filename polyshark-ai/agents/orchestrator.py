"""Minimal orchestrator entrypoint.

Scaffold — реальная логика (опрос рынков, расчёт EV/Kelly, постановка ордеров)
будет реализована в фазах 2–4 по SPEC.md. Сейчас сервис просто живёт
в loop'е и пишет heartbeat, чтобы Docker не уходил в restart-шторм.
"""
from __future__ import annotations

import asyncio
import logging
import os
import signal
from datetime import datetime, timezone

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("orchestrator")

HEARTBEAT_SEC = int(os.getenv("ORCHESTRATOR_HEARTBEAT_SEC", "30"))


class Orchestrator:
    def __init__(self) -> None:
        self._stop = asyncio.Event()

    def request_stop(self, *_: object) -> None:
        log.info("Stop signal received")
        self._stop.set()

    async def run(self) -> None:
        log.info("Orchestrator started (scaffold mode, heartbeat=%ss)", HEARTBEAT_SEC)
        tick = 0
        while not self._stop.is_set():
            tick += 1
            log.info(
                "heartbeat #%d @ %s — awaiting modules (data/features/model/exec)",
                tick,
                datetime.now(timezone.utc).isoformat(timespec="seconds"),
            )
            try:
                await asyncio.wait_for(self._stop.wait(), timeout=HEARTBEAT_SEC)
            except asyncio.TimeoutError:
                continue
        log.info("Orchestrator stopped cleanly")


async def main() -> None:
    orch = Orchestrator()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, orch.request_stop)
        except NotImplementedError:
            signal.signal(sig, orch.request_stop)
    await orch.run()


if __name__ == "__main__":
    asyncio.run(main())
