"""
PolyShark AI — Supabase async client
TODO (Шаг 2): реализовать полный CRUD
"""
import os
from supabase import create_client, Client

def get_client() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    return create_client(url, key)

class SupabaseDB:
    def __init__(self):
        self.client = get_client()

    async def save_prediction(self, data: dict) -> str:
        result = self.client.table("model_predictions").insert(data).execute()
        return result.data[0]["id"] if result.data else None

    async def save_order(self, signal, result: dict) -> str:
        row = {
            "token_id": signal.token_id,
            "side": signal.side,
            "price": signal.market_price,
            "size_usdc": signal.recommended_size,
            "status": "PENDING",
            "polymarket_order_id": result.get("orderID"),
        }
        res = self.client.table("orders").insert(row).execute()
        return res.data[0]["id"] if res.data else None

    async def get_recent_prices(self, token_id: str, hours: int = 24) -> list:
        from datetime import datetime, timedelta
        cutoff = (datetime.utcnow() - timedelta(hours=hours)).isoformat()
        # CLOB token id хранится в markets.yes_token_id / no_token_id,
        # market_prices индексируется по market_id (FK на markets.id).
        market = (
            self.client.table("markets")
            .select("id")
            .or_(f"yes_token_id.eq.{token_id},no_token_id.eq.{token_id}")
            .limit(1)
            .execute()
        )
        if not market.data:
            return []
        res = (
            self.client.table("market_prices")
            .select("*")
            .eq("market_id", market.data[0]["id"])
            .gte("recorded_at", cutoff)
            .order("recorded_at", desc=True)
            .execute()
        )
        return res.data or []
