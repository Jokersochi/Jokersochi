"""
PolyShark AI — FastAPI REST API
Endpoint'ы для дашборда и мониторинга
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="PolyShark AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok", "service": "polyshark-ai"}

@app.get("/status")
def status():
    return {
        "dry_run": os.getenv("DRY_RUN", "true").lower() == "true",
        "bankroll_usdc": float(os.getenv("BANKROLL_USDC", "500")),
        "prob_threshold": float(os.getenv("PROB_THRESHOLD", "0.80")),
        "open_positions": 0,  # TODO: из Supabase
    }

# TODO (Шаг 10): добавить /positions, /signals, /performance, /markets
