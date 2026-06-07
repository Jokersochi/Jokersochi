# PolyShark AI — System Specification & Codebase Blueprint v1.0

> **Role:** Senior Quant Developer / Architect (Web3 & ML)  
> **Target:** Selective Win Rate ≥ 80% via Abstention/Reject Option  
> **Platform:** Polymarket (CLOB, Polygon/USDC)

---

## 0. Согласие с математической базой отчёта

Отчёт корректен по всем ключевым тезисам:

| Тезис | Вердикт | Комментарий |
|-------|---------|-------------|
| 80% WR возможен только через селективность | ✅ | Неселективная точность потолок ~56% |
| Максимизировать EV, не Accuracy | ✅ | Стандарт quant-беттинга |
| FLB присутствует и на Polymarket | ✅ | Публичные рынки с толпой |
| Walk-Forward обязателен для time-series | ✅ | k-fold = data leakage |
| Venn-Abers лучше Platt/Isotonic | ✅ | Distribution-free guarantee |
| Latency критична для CLV | ✅ | Особенно при арбитраже |

**Одна поправка к отчёту:** Pi-Ratings и xG применимы только к спортивным рынкам. Polymarket покрывает также политику, крипто, макро — для них нужен отдельный Feature Engineering (описан в Module 4).

---

## 0a. Сборщик исторических данных (КРИТИЧЕСКИЙ БЛОКЕР)

> **Без этого модуля** Walk-Forward невозможен, Venn-Abers не откалибровать, ML-модель не обучить.  
> Запускается **один раз** перед всем остальным. Собирает 6–12 месяцев истории в Supabase.

```python
# data/collector.py
"""
Шаг 0a: Сбор исторических данных Polymarket.
Запуск: python -m data.collector --days 365

Что собирает:
  - Все закрытые рынки за N дней (с известными исходами)
  - Историю цен каждого рынка (временной ряд YES/NO)
  - Order book snapshots (для spread-фич)
  - Итоговый outcome (TRUE/FALSE) для разметки целевой переменной
"""
import asyncio
import httpx
import time
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
import pandas as pd
from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv()
logger = logging.getLogger("polyshark.collector")

GAMMA_API  = "https://gamma-api.polymarket.com"   # REST API для рынков
CLOB_API   = "https://clob.polymarket.com"         # CLOB для цен и стаканов

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# Категории для фильтрации (убираем низколиквидные)
CATEGORIES_WHITELIST = {"politics", "crypto", "sports", "economics", "science"}
MIN_VOLUME_USDC = 5_000   # минимальный объём рынка для включения в датасет


class PolymarketCollector:

    def __init__(self, days_back: int = 365):
        self.days_back = days_back
        self.cutoff = datetime.now(timezone.utc) - timedelta(days=days_back)
        self.db = create_client(SUPABASE_URL, SUPABASE_KEY)
        self.http = httpx.AsyncClient(timeout=30.0)
        self.stats = {"markets": 0, "price_points": 0, "errors": 0}

    # ------------------------------------------------------------------
    # 1. Сбор рынков (закрытых — с известными исходами)
    # ------------------------------------------------------------------
    async def fetch_closed_markets(self) -> list[dict]:
        """
        Gamma API отдаёт все рынки с пагинацией.
        Фильтруем: closed=True, volume >= MIN_VOLUME_USDC, дата закрытия >= cutoff.
        """
        markets = []
        offset  = 0
        limit   = 100

        while True:
            resp = await self.http.get(
                f"{GAMMA_API}/markets",
                params={
                    "closed":  "true",
                    "limit":   limit,
                    "offset":  offset,
                    "order":   "volume",
                    "ascending": "false",
                }
            )
            resp.raise_for_status()
            batch = resp.json()

            if not batch:
                break

            for m in batch:
                # Фильтр по дате
                end_date_str = m.get("endDateIso") or m.get("endDate") or ""
                try:
                    end_dt = datetime.fromisoformat(
                        end_date_str.replace("Z", "+00:00")
                    )
                except (ValueError, TypeError):
                    continue

                if end_dt < self.cutoff:
                    # Gamma отдаёт в порядке убывания объёма,
                    # но даты могут быть вперемешку — не прерываем
                    continue

                # Фильтр по объёму
                volume = float(m.get("volume", 0) or 0)
                if volume < MIN_VOLUME_USDC:
                    continue

                markets.append(m)

            offset += limit
            if len(batch) < limit:
                break

            await asyncio.sleep(0.2)   # вежливая пауза

        logger.info(f"Fetched {len(markets)} closed markets")
        return markets

    # ------------------------------------------------------------------
    # 2. История цен для одного рынка
    # ------------------------------------------------------------------
    async def fetch_price_history(
        self,
        condition_id: str,
        token_id: str,
        interval: str = "1h"   # 1m | 1h | 1d
    ) -> list[dict]:
        """
        CLOB Timeseries endpoint.
        Возвращает список {t: unix_ts, p: float} — цена YES-токена по времени.
        """
        try:
            resp = await self.http.get(
                f"{CLOB_API}/prices-history",
                params={
                    "market":   condition_id,
                    "tokenID":  token_id,
                    "interval": interval,
                    "fidelity": 60,   # минут
                }
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("history", [])
        except Exception as e:
            logger.warning(f"Price history error {condition_id[:12]}: {e}")
            self.stats["errors"] += 1
            return []

    # ------------------------------------------------------------------
    # 3. Сохранение в Supabase
    # ------------------------------------------------------------------
    async def save_market(self, m: dict) -> Optional[str]:
        """Upsert рынка в таблицу markets. Возвращает UUID."""
        # Определяем outcome
        outcome = None
        winning_token = m.get("winnerTokenId") or ""
        tokens = m.get("tokens", [])
        for t in tokens:
            if t.get("token_id") == winning_token:
                outcome = (t.get("outcome", "").upper() == "YES")
                break

        yes_token_id = next(
            (t["token_id"] for t in tokens if t.get("outcome","").upper()=="YES"),
            None
        )
        no_token_id = next(
            (t["token_id"] for t in tokens if t.get("outcome","").upper()=="NO"),
            None
        )

        record = {
            "polymarket_id":  m.get("id") or m.get("conditionId", ""),
            "condition_id":   m.get("conditionId", ""),
            "question":       m.get("question", ""),
            "category":       (m.get("category") or "other").lower(),
            "yes_token_id":   yes_token_id,
            "no_token_id":    no_token_id,
            "resolution_date": m.get("endDateIso") or m.get("endDate"),
            "resolved_at":    m.get("resolutionTime"),
            "outcome":        outcome,
            "total_volume":   float(m.get("volume", 0) or 0),
            "is_active":      False,   # исторические — закрытые
        }

        result = (
            self.db.table("markets")
            .upsert(record, on_conflict="polymarket_id")
            .execute()
        )
        return result.data[0]["id"] if result.data else None

    async def save_price_history(
        self, market_uuid: str, polymarket_id: str, history: list[dict]
    ) -> int:
        """Batch-вставка истории цен. Возвращает кол-во записей."""
        if not history:
            return 0

        rows = []
        for point in history:
            ts = point.get("t") or point.get("timestamp")
            price = point.get("p") or point.get("price")
            if ts is None or price is None:
                continue
            rows.append({
                "market_id":     market_uuid,
                "polymarket_id": polymarket_id,
                "yes_price":     round(float(price), 4),
                "no_price":      round(1.0 - float(price), 4),
                "recorded_at":   datetime.fromtimestamp(
                    int(ts), tz=timezone.utc
                ).isoformat(),
            })

        if not rows:
            return 0

        # Вставляем пачками по 500 (лимит Supabase)
        batch_size = 500
        inserted = 0
        for i in range(0, len(rows), batch_size):
            batch = rows[i:i + batch_size]
            self.db.table("market_prices").upsert(
                batch,
                on_conflict="market_id,recorded_at"
            ).execute()
            inserted += len(batch)

        return inserted

    # ------------------------------------------------------------------
    # 4. Главный цикл
    # ------------------------------------------------------------------
    async def run(self) -> dict:
        logger.info(f"Collector starting | cutoff={self.cutoff.date()} | days={self.days_back}")

        markets = await self.fetch_closed_markets()

        for i, m in enumerate(markets):
            pid      = m.get("id") or m.get("conditionId", "")
            cond_id  = m.get("conditionId", "")
            tokens   = m.get("tokens", [])
            yes_tid  = next(
                (t["token_id"] for t in tokens if t.get("outcome","").upper()=="YES"),
                None
            )

            if not yes_tid:
                continue

            # Сохраняем рынок
            market_uuid = await self.save_market(m)
            if not market_uuid:
                continue

            # Загружаем историю цен
            history = await self.fetch_price_history(cond_id, yes_tid, interval="1h")
            n_points = await self.save_price_history(market_uuid, pid, history)

            self.stats["markets"] += 1
            self.stats["price_points"] += n_points

            if (i + 1) % 50 == 0:
                logger.info(
                    f"Progress: {i+1}/{len(markets)} markets | "
                    f"{self.stats['price_points']:,} price points"
                )

            await asyncio.sleep(0.1)   # rate limit

        await self.http.aclose()
        logger.info(f"Collection complete: {self.stats}")
        return self.stats


# ------------------------------------------------------------------
# CLI entry point
# python -m data.collector --days 365
# ------------------------------------------------------------------
if __name__ == "__main__":
    import argparse
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")

    parser = argparse.ArgumentParser(description="Polymarket historical data collector")
    parser.add_argument("--days", type=int, default=365, help="Days of history to collect")
    args = parser.parse_args()

    stats = asyncio.run(PolymarketCollector(days_back=args.days).run())
    print(f"\nDone: {stats}")
```

---

## 0b. Feature Engineering Pipeline (КРИТИЧЕСКИЙ БЛОКЕР)

> **Связка:** рынок → фичи → DataFrame → ML-модель.  
> Превращает сырые данные из Supabase в матрицу признаков для обучения и инференса.

```python
# data/feature_pipeline.py
"""
Шаг 0b: Feature Engineering Pipeline.
Вход:  market_prices + markets из Supabase
Выход: pandas DataFrame с фичами + target (outcome) для Walk-Forward CV

Категории фич:
  A. Рыночные (Polymarket-specific) — цена, тренд, momentum, spread
  B. Временные — дни до закрытия, время суток, день недели
  C. Объёмные — логарифм объёма, изменение активности
  D. Контекстные — категория, экстремальные цены, near-50/50
  E. Технические — RSI, Bollinger, ATR на временном ряду цен
"""
import numpy as np
import pandas as pd
from supabase import create_client
from datetime import datetime, timezone
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")


class FeaturePipeline:

    def __init__(self):
        self.db = create_client(SUPABASE_URL, SUPABASE_KEY)

    # ------------------------------------------------------------------
    # A. Загрузка данных
    # ------------------------------------------------------------------
    def load_resolved_markets(self, min_volume: float = 5_000) -> pd.DataFrame:
        """Загружает закрытые рынки с известным outcome из Supabase."""
        result = (
            self.db.table("markets")
            .select("*")
            .eq("is_active", False)
            .not_.is_("outcome", "null")
            .gte("total_volume", min_volume)
            .execute()
        )
        df = pd.DataFrame(result.data)
        df["resolution_date"] = pd.to_datetime(df["resolution_date"], utc=True)
        df["outcome"] = df["outcome"].astype(int)   # True→1, False→0
        return df

    def load_price_history(self, market_ids: list[str]) -> pd.DataFrame:
        """Загружает временные ряды цен для списка рынков."""
        result = (
            self.db.table("market_prices")
            .select("market_id, yes_price, recorded_at")
            .in_("market_id", market_ids)
            .order("recorded_at")
            .execute()
        )
        df = pd.DataFrame(result.data)
        df["recorded_at"] = pd.to_datetime(df["recorded_at"], utc=True)
        return df

    # ------------------------------------------------------------------
    # B. Вычисление фич для одного рынка
    # ------------------------------------------------------------------
    def compute_market_features(
        self,
        market: pd.Series,
        prices: pd.DataFrame,
        snapshot_hours_before_close: int = 24
    ) -> dict:
        """
        Вычисляет вектор фич для одного рынка.
        snapshot_hours_before_close: смотрим на цену за N часов до закрытия.
        Это критично для Point-in-Time корректности — исключает look-ahead.
        """
        mkt_prices = prices[prices["market_id"] == market["id"]].copy()
        mkt_prices = mkt_prices.sort_values("recorded_at")

        if mkt_prices.empty or len(mkt_prices) < 5:
            return None   # недостаточно данных

        res_date = pd.to_datetime(market["resolution_date"], utc=True)

        # ---- Point-in-Time snapshot ----
        # Используем только данные, доступные ДО snapshot_hours_before_close
        cutoff_time = res_date - pd.Timedelta(hours=snapshot_hours_before_close)
        pit_prices = mkt_prices[mkt_prices["recorded_at"] <= cutoff_time]

        if len(pit_prices) < 3:
            return None

        prices_arr = pit_prices["yes_price"].values
        current    = float(prices_arr[-1])
        timestamps = pit_prices["recorded_at"].values

        # ---- A. Рыночные фичи ----
        feats = {}

        # Текущая цена и её логит-трансформация
        feats["yes_price"]       = current
        feats["log_odds"]        = np.log(current / (1 - current + 1e-6))
        feats["price_extreme"]   = int(current < 0.05 or current > 0.95)
        feats["near_50_50"]      = int(abs(current - 0.5) < 0.10)

        # Momentum (изменение цены за N последних точек)
        feats["mom_6h"]  = current - float(prices_arr[-min(6, len(prices_arr))])
        feats["mom_24h"] = current - float(prices_arr[-min(24, len(prices_arr))])
        feats["mom_72h"] = current - float(prices_arr[-min(72, len(prices_arr))])
        feats["mom_7d"]  = current - float(prices_arr[-min(168, len(prices_arr))])

        # Скользящие средние
        feats["sma_24h"] = float(np.mean(prices_arr[-min(24, len(prices_arr)):]))
        feats["sma_72h"] = float(np.mean(prices_arr[-min(72, len(prices_arr)):]))

        # Отклонение от SMA
        feats["price_vs_sma24"] = current - feats["sma_24h"]
        feats["price_vs_sma72"] = current - feats["sma_72h"]

        # Волатильность (std цен)
        feats["vol_24h"] = float(np.std(prices_arr[-min(24, len(prices_arr)):]))
        feats["vol_7d"]  = float(np.std(prices_arr[-min(168, len(prices_arr)):]))

        # ---- B. RSI (14 периодов) ----
        feats["rsi_14"] = self._rsi(prices_arr, period=14)

        # ---- C. Bollinger Bands ----
        bb = self._bollinger(prices_arr, period=20)
        feats["bb_upper"]    = bb["upper"]
        feats["bb_lower"]    = bb["lower"]
        feats["bb_position"] = bb["position"]   # 0=нижняя, 1=верхняя граница
        feats["bb_width"]    = bb["width"]

        # ---- D. Временные фичи ----
        days_to_close = (res_date - cutoff_time).total_seconds() / 86400
        feats["days_to_close"]  = max(0.0, days_to_close)
        feats["log_days_close"] = np.log1p(feats["days_to_close"])
        feats["time_pressure"]  = 1.0 / (feats["days_to_close"] + 1)

        # Время суток последнего snapshot
        last_ts = pd.Timestamp(timestamps[-1])
        feats["hour_of_day"]  = last_ts.hour
        feats["day_of_week"]  = last_ts.dayofweek

        # ---- E. Объёмные фичи ----
        feats["log_volume"]     = np.log1p(float(market.get("total_volume", 0) or 0))

        # ---- F. Категориальные ----
        category = str(market.get("category", "other")).lower()
        for cat in ["politics", "crypto", "sports", "economics", "science", "other"]:
            feats[f"cat_{cat}"] = int(category == cat)

        # ---- G. Фичи тренда ----
        if len(prices_arr) >= 10:
            trend_slope = np.polyfit(np.arange(len(prices_arr[-24:])),
                                     prices_arr[-24:], 1)[0]
            feats["trend_slope_24h"] = float(trend_slope)
        else:
            feats["trend_slope_24h"] = 0.0

        # ---- Target ----
        feats["target"]    = int(market["outcome"])
        feats["market_id"] = market["id"]
        feats["resolution_date"] = res_date.isoformat()

        return feats

    # ------------------------------------------------------------------
    # Технические индикаторы
    # ------------------------------------------------------------------
    def _rsi(self, prices: np.ndarray, period: int = 14) -> float:
        if len(prices) < period + 1:
            return 50.0   # нейтральное значение по умолчанию

        deltas = np.diff(prices[-(period + 1):])
        gains  = deltas[deltas > 0].mean() if (deltas > 0).any() else 0.0
        losses = abs(deltas[deltas < 0].mean()) if (deltas < 0).any() else 0.0

        if losses == 0:
            return 100.0
        rs  = gains / losses
        return round(100.0 - 100.0 / (1.0 + rs), 4)

    def _bollinger(self, prices: np.ndarray, period: int = 20) -> dict:
        if len(prices) < period:
            return {"upper": 1.0, "lower": 0.0, "position": 0.5, "width": 1.0}

        window  = prices[-period:]
        mid     = np.mean(window)
        std     = np.std(window)
        upper   = min(mid + 2 * std, 1.0)
        lower   = max(mid - 2 * std, 0.0)
        current = float(prices[-1])
        width   = upper - lower

        position = (current - lower) / (width + 1e-9)
        return {
            "upper":    round(float(upper), 4),
            "lower":    round(float(lower), 4),
            "position": round(float(np.clip(position, 0, 1)), 4),
            "width":    round(float(width), 4),
        }

    # ------------------------------------------------------------------
    # C. Главный метод: строит DataFrame для всего датасета
    # ------------------------------------------------------------------
    def build_dataset(
        self,
        min_volume: float = 5_000,
        snapshot_hours: int = 24
    ) -> pd.DataFrame:
        """
        Строит полный датасет фич для обучения ML-модели.
        Возвращает DataFrame, отсортированный по resolution_date (для Walk-Forward).
        """
        print("Loading resolved markets from Supabase...")
        markets_df = self.load_resolved_markets(min_volume=min_volume)
        print(f"  → {len(markets_df)} markets loaded")

        market_ids = markets_df["id"].tolist()
        print(f"Loading price history for {len(market_ids)} markets...")
        prices_df  = self.load_price_history(market_ids)
        print(f"  → {len(prices_df):,} price points loaded")

        print("Computing features...")
        rows = []
        for _, market in markets_df.iterrows():
            feats = self.compute_market_features(
                market, prices_df, snapshot_hours_before_close=snapshot_hours
            )
            if feats:
                rows.append(feats)

        df = pd.DataFrame(rows)
        df["resolution_date"] = pd.to_datetime(df["resolution_date"], utc=True)
        df = df.sort_values("resolution_date").reset_index(drop=True)

        print(f"Dataset built: {len(df)} rows × {len(df.columns)} columns")
        print(f"Target distribution: YES={df['target'].mean():.1%} | NO={1-df['target'].mean():.1%}")
        return df

    def get_feature_columns(self, df: pd.DataFrame) -> list[str]:
        """Возвращает список фичей (без target/meta колонок)."""
        exclude = {"target", "market_id", "resolution_date"}
        return [c for c in df.columns if c not in exclude]


# ------------------------------------------------------------------
# CLI entry point
# python -m data.feature_pipeline --output data/features.parquet
# ------------------------------------------------------------------
if __name__ == "__main__":
    import argparse
    pipeline = FeaturePipeline()

    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="data/features.parquet")
    parser.add_argument("--min-volume", type=float, default=5000)
    args = parser.parse_args()

    df = pipeline.build_dataset(min_volume=args.min_volume)
    df.to_parquet(args.output, index=False)
    print(f"Saved to {args.output}")
```

---

## 1. Архитектура системы (High-Level)

```
┌─────────────────────────────────────────────────────────────┐
│                     PolyShark AI                            │
│                                                             │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌────────┐  │
│  │  Data    │   │ Feature  │   │  Model   │   │ Exec   │  │
│  │ Ingestion│──▶│ Engine   │──▶│  Stack   │──▶│ Agent  │  │
│  └──────────┘   └──────────┘   └──────────┘   └────────┘  │
│       │               │              │              │       │
│       ▼               ▼              ▼              ▼       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Supabase (PostgreSQL + Realtime)        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────┐   ┌──────────┐   ┌──────────────────────┐   │
│  │  Redis   │   │ Risk Mgr │   │  Dashboard (Next.js)  │   │
│  │  Cache   │   │ (Kelly)  │   │  + Telegram Bot       │   │
│  └──────────┘   └──────────┘   └──────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Микросервисы

| Сервис | Технология | Latency | Функция |
|--------|-----------|---------|---------|
| `data-stream` | Python asyncio + uvloop | 2–5 мс | WebSocket CLOB |
| `feature-engine` | Python + Redis | <1 мс | Pi-Ratings, xG, NLP |
| `model-inference` | LightGBM + CatBoost | 10–15 мс | Ensemble scoring |
| `calibration` | Python venn-abers | 15–20 мс | IVAP p0/p1 |
| `risk-manager` | Python (Kelly) | <1 мс | Sizing + gating |
| `exec-agent` | py_clob_client_v2 | 5–8 мс | Order placement |
| `api-gateway` | FastAPI | — | REST для дашборда |

---

## 2. Математический аппарат

### 2.1 Очистка FLB через FL-GLM

**Проблема:** Стандартная нормализация `p_i = (1/odds_i) / sum(1/odds_j)` распределяет маржу пропорционально, что создаёт ложные EV-сигналы.

**Решение — FL-GLM (Favorite-Longshot GLM):**

```python
# modules/flb_cleaner.py
import numpy as np
from scipy.optimize import minimize_scalar
from scipy.special import expit  # sigmoid

def shin_model(raw_odds: list[float]) -> list[float]:
    """
    Модель Шина: оценивает долю инсайдеров z, 
    затем корректирует вероятности.
    """
    inv_odds = [1.0 / o for o in raw_odds]
    overround = sum(inv_odds)
    
    def objective(z):
        probs = []
        for q in inv_odds:
            # Формула Шина
            p = (np.sqrt(z**2 + 4*(1-z)*q/overround * q) - z) / (2*(1-z))
            probs.append(p)
        return abs(sum(probs) - 1.0)
    
    result = minimize_scalar(objective, bounds=(0.001, 0.3), method='bounded')
    z = result.x
    
    clean_probs = []
    for q in inv_odds:
        p = (np.sqrt(z**2 + 4*(1-z)*q/overround * q) - z) / (2*(1-z))
        clean_probs.append(p)
    
    # Нормализация
    total = sum(clean_probs)
    return [p / total for p in clean_probs]


def fl_glm(raw_odds: list[float], gamma: float = None) -> list[float]:
    """
    FL-GLM: прямая оценка параметра искажения gamma.
    Оптимален для backtesting с историческими данными.
    """
    inv_odds = [1.0 / o for o in raw_odds]
    overround = sum(inv_odds)
    q = [x / overround for x in inv_odds]  # naive probs
    
    if gamma is None:
        # Оцениваем gamma через логистическую регрессию на истории
        # Здесь используем типичное значение для prediction markets
        gamma = 0.05  # подбирается на калибровочной выборке
    
    # Коррекция FLB: штрафуем аутсайдеров
    adjusted = []
    for qi in q:
        # Нелинейная трансформация
        p_adj = expit(np.log(qi / (1 - qi)) + gamma * (0.5 - qi))
        adjusted.append(p_adj)
    
    total = sum(adjusted)
    return [p / total for p in adjusted]


def oo_epc(raw_odds: list[float]) -> list[float]:
    """
    OO-EPC (Odds-Only Expected Profit Correction):
    Быстрый метод для real-time котировок.
    """
    inv_odds = [1.0 / o for o in raw_odds]
    overround = sum(inv_odds)
    
    # Power method: p_i = (1/odds_i)^k / sum((1/odds_j)^k)
    # k оптимизируется так, чтобы sum(p_i) = 1 и ROI = 0
    def power_sum(k):
        powered = [x**k for x in inv_odds]
        return sum(powered) - 1.0
    
    from scipy.optimize import brentq
    try:
        k = brentq(power_sum, 0.5, 2.0)
    except ValueError:
        k = 1.0 / overround  # fallback
    
    powered = [x**k for x in inv_odds]
    total = sum(powered)
    return [p / total for p in powered]
```

### 2.2 Калибровка Венна-Аберса (IVAP)

```python
# modules/calibration.py
import numpy as np
from venn_abers import VennAbersCalibrator

class PolySharkCalibrator:
    """
    Обёртка над IVAP с консервативной оценкой вероятностей.
    Возвращает p0 (нижняя граница) для минимизации переоценки силы сигнала.
    """
    
    def __init__(self, conservative: bool = True):
        self.calibrator = VennAbersCalibrator(inductive=True, n_jobs=-1)
        self.conservative = conservative
        self.fitted = False
    
    def fit(self, scores: np.ndarray, labels: np.ndarray) -> None:
        """
        scores: raw model output (sigmoid/logit)
        labels: binary 0/1
        """
        self.calibrator.fit(scores.reshape(-1, 1), labels)
        self.fitted = True
    
    def predict(self, scores: np.ndarray) -> dict:
        """
        Returns:
            p0: нижняя граница (консервативная оценка)
            p1: верхняя граница
            p_point: точечная оценка p0/(1-p1+p0)
            uncertainty: ширина интервала (эпистемическая неопределённость)
        """
        assert self.fitted, "Fit calibrator first"
        
        p0, p1 = self.calibrator.predict_proba(scores.reshape(-1, 1))
        
        # Точечная оценка (формула из отчёта)
        p_point = p0 / (1 - p1 + p0 + 1e-9)
        uncertainty = p1 - p0
        
        return {
            "p0": p0,
            "p1": p1,
            "p_point": p_point,
            "uncertainty": uncertainty,
            "p_exec": p0 if self.conservative else p_point
        }
    
    def should_execute(self, scores: np.ndarray, threshold: float = 0.80) -> np.ndarray:
        """
        Триггер исполнения: p0 >= threshold AND uncertainty < 0.15
        """
        result = self.predict(scores)
        return (result["p0"] >= threshold) & (result["uncertainty"] < 0.15)
```

### 2.3 Expected Value и Kelly Criterion

```python
# modules/ev_kelly.py
import numpy as np
from dataclasses import dataclass

@dataclass
class TradeSignal:
    market_id: str
    token_id: str
    side: str  # "YES" or "NO"
    market_prob: float    # после FLB-очистки
    model_prob: float     # p0 из IVAP (консервативная)
    market_price: float   # цена в CLOB (0.01–0.99)
    ev: float
    kelly_fraction: float
    recommended_size: float  # USDC
    execute: bool


def calculate_ev(model_prob: float, market_price: float) -> float:
    """
    EV = p_model * (1/market_price - 1) - (1 - p_model)
    Для бинарного рынка Polymarket (payoff = 1.0 при победе)
    
    market_price — это вероятность как цена (0.65 = 65 центов за $1 при выигрыше)
    implied_odds = 1 / market_price
    """
    if market_price <= 0 or market_price >= 1:
        return -999.0
    
    implied_odds = 1.0 / market_price
    ev = model_prob * (implied_odds - 1) - (1 - model_prob)
    return round(ev, 4)


def fractional_kelly(
    model_prob: float,
    market_price: float,
    bankroll: float,
    fraction: float = 0.25,  # Используем 1/4 Kelly для снижения дисперсии
    max_position_pct: float = 0.05  # Не более 5% банкролла на сделку
) -> float:
    """
    Дробный критерий Келли.
    
    Полный Kelly: f* = (b*p - q) / b
    где b = odds - 1 = (1/price - 1), p = model_prob, q = 1-p
    """
    if market_price <= 0 or market_price >= 1:
        return 0.0
    
    b = (1.0 / market_price) - 1.0  # net odds
    p = model_prob
    q = 1.0 - p
    
    full_kelly = (b * p - q) / b
    
    if full_kelly <= 0:
        return 0.0  # Отрицательный Kelly = не ставить
    
    # Дробный Kelly
    frac_kelly = fraction * full_kelly
    
    # Кеп по максимальной позиции
    max_size = bankroll * max_position_pct
    recommended = min(frac_kelly * bankroll, max_size)
    
    return round(recommended, 2)


def generate_signal(
    market_id: str,
    token_id: str,
    side: str,
    model_prob_p0: float,
    market_price: float,
    bankroll: float,
    ev_threshold: float = 0.05,
    prob_threshold: float = 0.80
) -> TradeSignal:
    """
    Главная функция: генерирует сигнал с решением execute/skip.
    """
    ev = calculate_ev(model_prob_p0, market_price)
    kelly_size = fractional_kelly(model_prob_p0, market_price, bankroll)
    
    # Двойной триггер: p0 >= threshold И EV > threshold
    execute = (
        model_prob_p0 >= prob_threshold and
        ev > ev_threshold and
        kelly_size >= 5.0  # Минимальная ставка $5
    )
    
    return TradeSignal(
        market_id=market_id,
        token_id=token_id,
        side=side,
        market_prob=market_price,
        model_prob=model_prob_p0,
        market_price=market_price,
        ev=ev,
        kelly_fraction=kelly_size / bankroll if bankroll > 0 else 0,
        recommended_size=kelly_size,
        execute=execute
    )
```

---

## 3. Архитектура валидации

### 3.1 Walk-Forward Validation

```python
# modules/validation.py
import pandas as pd
import numpy as np
from typing import Generator, Tuple
from datetime import timedelta

def walk_forward_splits(
    df: pd.DataFrame,
    date_col: str,
    train_window_days: int = 365,
    test_window_days: int = 30,
    step_days: int = 30,
    embargo_days: int = 5
) -> Generator[Tuple[pd.DataFrame, pd.DataFrame], None, None]:
    """
    Временная Walk-Forward валидация с эмбарго.
    
    Timeline:
    |----TRAIN----|--embargo--|--TEST--|--step-->
    
    Args:
        embargo_days: буфер между train и test для нейтрализации автокорреляции
    """
    df = df.sort_values(date_col).reset_index(drop=True)
    df[date_col] = pd.to_datetime(df[date_col])
    
    min_date = df[date_col].min()
    max_date = df[date_col].max()
    
    train_start = min_date
    train_end = min_date + timedelta(days=train_window_days)
    
    while train_end + timedelta(days=test_window_days) <= max_date:
        test_start = train_end + timedelta(days=embargo_days)
        test_end = test_start + timedelta(days=test_window_days)
        
        train_mask = (df[date_col] >= train_start) & (df[date_col] < train_end)
        test_mask = (df[date_col] >= test_start) & (df[date_col] < test_end)
        
        train_df = df[train_mask].copy()
        test_df = df[test_mask].copy()
        
        if len(train_df) > 100 and len(test_df) > 10:
            yield train_df, test_df
        
        # Сдвигаем окно вперёд
        train_end += timedelta(days=step_days)


def purged_cv(
    df: pd.DataFrame,
    event_start_col: str,
    event_end_col: str,
    n_splits: int = 5,
    embargo_pct: float = 0.01
) -> Generator[Tuple[np.ndarray, np.ndarray], None, None]:
    """
    Purged Cross-Validation для перекрывающихся горизонтов.
    Удаляет из обучения события, пересекающиеся с валидацией.
    """
    n = len(df)
    indices = np.arange(n)
    embargo_size = int(n * embargo_pct)
    
    fold_size = n // n_splits
    
    for fold in range(n_splits):
        test_start = fold * fold_size
        test_end = (fold + 1) * fold_size if fold < n_splits - 1 else n
        
        test_idx = indices[test_start:test_end]
        
        # Временные рамки тестового фолда
        test_event_starts = df.iloc[test_idx][event_start_col].values
        test_event_ends = df.iloc[test_idx][event_end_col].values
        
        test_window_start = test_event_starts.min()
        test_window_end = test_event_ends.max()
        
        # Purging: удаляем обучающие примеры, пересекающиеся с тест-окном
        train_mask = np.ones(n, dtype=bool)
        train_mask[test_start:test_end + embargo_size] = False
        
        # Дополнительная очистка: убираем примеры с перекрывающимися исходами
        for i in range(n):
            if train_mask[i]:
                evt_start = df.iloc[i][event_start_col]
                evt_end = df.iloc[i][event_end_col]
                # Если исход перекрывается с тест-окном — удаляем
                if evt_end >= test_window_start and evt_start <= test_window_end:
                    train_mask[i] = False
        
        train_idx = indices[train_mask]
        yield train_idx, test_idx


def backtest_metrics(signals: list[TradeSignal], outcomes: dict) -> dict:
    """
    Считает метрики бэктеста.
    outcomes: {market_id: True/False (победа)}
    """
    executed = [s for s in signals if s.execute]
    if not executed:
        return {"error": "No signals executed"}
    
    wins = sum(1 for s in executed if outcomes.get(s.market_id, False))
    
    total_staked = sum(s.recommended_size for s in executed)
    total_returned = sum(
        s.recommended_size / s.market_price 
        for s in executed 
        if outcomes.get(s.market_id, False)
    )
    
    profit = total_returned - total_staked
    roi = profit / total_staked if total_staked > 0 else 0
    win_rate = wins / len(executed)
    
    return {
        "total_signals": len(signals),
        "executed_signals": len(executed),
        "abstention_rate": 1 - len(executed) / max(len(signals), 1),
        "win_rate": round(win_rate, 4),
        "total_staked": round(total_staked, 2),
        "profit": round(profit, 2),
        "roi": round(roi, 4),
        "avg_ev": round(np.mean([s.ev for s in executed]), 4),
        "avg_kelly": round(np.mean([s.kelly_fraction for s in executed]), 4),
    }
```

---

## 4. Feature Engineering

### 4.1 Pi-Ratings (спортивные рынки)

```python
# modules/features/pi_ratings.py
import numpy as np
from collections import defaultdict
import math

class PiRatings:
    """
    Динамическая рейтинговая система Pi-Ratings.
    Раздельно моделирует HOME и AWAY силу команд.
    
    Оптимальные параметры (верифицированы на европейских лигах):
    lambda_home = 0.035, lambda_away = 0.019
    """
    
    def __init__(self, lambda_home: float = 0.035, lambda_away: float = 0.019,
                 base_rating: float = 0.0):
        self.lh = lambda_home
        self.la = lambda_away
        self.base = base_rating
        # ratings[team] = {"home": float, "away": float}
        self.ratings = defaultdict(lambda: {"home": self.base, "away": self.base})
    
    def _log_dampen(self, goal_diff: float) -> float:
        """Логарифмическое затухание для крупных разгромов."""
        if goal_diff == 0:
            return 0.0
        sign = 1 if goal_diff > 0 else -1
        return sign * math.log(1 + abs(goal_diff))
    
    def update(self, home_team: str, away_team: str, 
               home_goals: int, away_goals: int) -> dict:
        """
        Обновляет рейтинги после матча.
        Returns: dict с обновлёнными рейтингами и фичами для ML.
        """
        # Фичи до обновления (для обучения модели)
        pre_features = self.get_features(home_team, away_team)
        
        rh = self.ratings[home_team]["home"]
        ra = self.ratings[away_team]["away"]
        
        actual_diff = home_goals - away_goals
        expected_diff = rh - ra
        
        error = self._log_dampen(actual_diff) - self._log_dampen(expected_diff)
        
        # Обновление по итеративному закону
        self.ratings[home_team]["home"] += self.lh * error
        self.ratings[away_team]["away"] -= self.la * error
        
        # Межплощадочный перенос (home→away rating transfer)
        self.ratings[home_team]["away"] += self.la * error * 0.5
        self.ratings[away_team]["home"] -= self.lh * error * 0.5
        
        return pre_features
    
    def get_features(self, home_team: str, away_team: str) -> dict:
        """Возвращает вектор фич для матча (до начала)."""
        return {
            "home_rating_home": self.ratings[home_team]["home"],
            "home_rating_away": self.ratings[home_team]["away"],
            "away_rating_home": self.ratings[away_team]["home"],
            "away_rating_away": self.ratings[away_team]["away"],
            "rating_diff": self.ratings[home_team]["home"] - self.ratings[away_team]["away"],
            "home_advantage": self.ratings[home_team]["home"] - self.ratings[home_team]["away"],
            "away_vulnerability": self.ratings[away_team]["home"] - self.ratings[away_team]["away"],
        }
```

### 4.2 Sequence-Based xG

```python
# modules/features/xg_sequence.py
import numpy as np
from dataclasses import dataclass

@dataclass
class ShotEvent:
    x: float          # координата x (0-100)
    y: float          # координата y (0-100)
    distance: float   # метры до ворот
    angle: float      # угол обстрела (радианы)
    preceded_by_cross: bool
    preceded_by_corner: bool
    fast_break: bool
    n_defenders: int  # давление защитников
    chain_length: int # длина владения перед ударом
    breaking_passes: int  # пасы за линию защиты

def basic_xg(shot: ShotEvent) -> float:
    """
    Базовый xG на основе пространственных признаков.
    Логистическая модель (упрощённая).
    """
    # Коэффициенты из типичной xG-модели
    intercept = -1.562
    w_dist = -0.096
    w_angle = 1.233
    w_cross = 0.310
    w_corner = 0.082
    w_break = 0.641
    w_defenders = -0.146
    
    z = (intercept + 
         w_dist * shot.distance + 
         w_angle * shot.angle +
         w_cross * int(shot.preceded_by_cross) +
         w_corner * int(shot.preceded_by_corner) +
         w_break * int(shot.fast_break) +
         w_defenders * shot.n_defenders)
    
    return 1.0 / (1.0 + np.exp(-z))


def sequence_xg_adjustment(shot: ShotEvent, base_xg: float) -> float:
    """
    Корректировка xG с учётом качества владения (Sequence-Based xG).
    Длинные цепочки с прорывными пасами увеличивают реальный xG.
    """
    chain_factor = min(1.0 + 0.05 * shot.chain_length, 1.5)
    break_factor = 1.0 + 0.08 * shot.breaking_passes
    
    adjusted = base_xg * chain_factor * break_factor
    return min(adjusted, 0.99)  # cap at 99%


def aggregate_team_xg(shots: list[ShotEvent]) -> dict:
    """Агрегирует xG команды за период."""
    if not shots:
        return {"xg_sum": 0.0, "xg_max": 0.0, "shots_on_target": 0, "xg_per_shot": 0.0}
    
    xg_values = []
    for shot in shots:
        base = basic_xg(shot)
        seq = sequence_xg_adjustment(shot, base)
        xg_values.append(seq)
    
    return {
        "xg_sum": sum(xg_values),
        "xg_max": max(xg_values),
        "shots_on_target": len([s for s in shots if s.distance < 25]),
        "xg_per_shot": sum(xg_values) / len(xg_values),
        "xg_overperformance": None  # заполняется постфактум
    }
```

### 4.3 Фичи для не-спортивных рынков (политика, крипто, макро)

```python
# modules/features/market_features.py
"""
Фичи для политических и крипто-рынков Polymarket.
"""
import numpy as np
from datetime import datetime, timedelta

def crypto_market_features(
    asset_price_history: list[float],
    volume_history: list[float],
    current_price: float,
    resolution_date: datetime
) -> dict:
    """Фичи для крипто-рынков."""
    prices = np.array(asset_price_history[-30:])  # последние 30 дней
    vols = np.array(volume_history[-30:])
    
    days_to_resolution = (resolution_date - datetime.now()).days
    
    return {
        "price_sma_7d": np.mean(prices[-7:]) if len(prices) >= 7 else current_price,
        "price_sma_30d": np.mean(prices),
        "price_momentum_7d": (current_price / prices[-7] - 1) if len(prices) >= 7 else 0,
        "price_volatility_30d": np.std(prices) / np.mean(prices) if np.mean(prices) > 0 else 0,
        "volume_trend": np.polyfit(np.arange(len(vols)), vols, 1)[0] if len(vols) > 1 else 0,
        "days_to_resolution": days_to_resolution,
        "time_pressure": 1.0 / (days_to_resolution + 1),  # чем ближе, тем выше
        "current_vs_target_ratio": None,  # заполняется отдельно
    }


def polymarket_market_features(
    market_history: list[dict],  # история цен на Polymarket
    current_yes_price: float,
    total_volume_usdc: float
) -> dict:
    """Фичи из самого рынка Polymarket."""
    if not market_history:
        return {}
    
    prices = [h["yes_price"] for h in market_history]
    
    return {
        "market_momentum_1d": prices[-1] - prices[-24] if len(prices) >= 24 else 0,
        "market_momentum_7d": prices[-1] - prices[-168] if len(prices) >= 168 else 0,
        "price_reversion": current_yes_price - np.mean(prices[-48:]) if len(prices) >= 48 else 0,
        "market_depth_imbalance": None,  # из order book
        "log_volume": np.log1p(total_volume_usdc),
        "price_extreme": int(current_yes_price < 0.05 or current_yes_price > 0.95),
        "near_50_50": int(abs(current_yes_price - 0.5) < 0.1),
    }
```

---

## 5. База данных — Supabase DDL

```sql
-- ============================================
-- POLYSHARK AI — Production Supabase Schema
-- ============================================

-- Расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "timescaledb";  -- опционально для time-series

-- ============================================
-- Таблица: markets (рынки Polymarket)
-- ============================================
CREATE TABLE markets (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    polymarket_id   VARCHAR(100) UNIQUE NOT NULL,
    condition_id    VARCHAR(100),
    question        TEXT NOT NULL,
    category        VARCHAR(50),        -- 'sports', 'politics', 'crypto', 'other'
    yes_token_id    VARCHAR(100),
    no_token_id     VARCHAR(100),
    resolution_date TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ,
    outcome         BOOLEAN,            -- NULL = не разрешён, TRUE = YES, FALSE = NO
    final_yes_price DECIMAL(6,4),
    total_volume    DECIMAL(18,2) DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    metadata        JSONB DEFAULT '{}'
);

CREATE INDEX idx_markets_active ON markets(is_active, resolution_date);
CREATE INDEX idx_markets_category ON markets(category);
CREATE INDEX idx_markets_polymarket_id ON markets(polymarket_id);

-- ============================================
-- Таблица: market_prices (история цен — time-series)
-- ============================================
CREATE TABLE market_prices (
    id              BIGSERIAL PRIMARY KEY,
    market_id       UUID REFERENCES markets(id) ON DELETE CASCADE,
    polymarket_id   VARCHAR(100) NOT NULL,
    yes_price       DECIMAL(6,4) NOT NULL,
    no_price        DECIMAL(6,4) NOT NULL,
    best_ask_yes    DECIMAL(6,4),
    best_bid_yes    DECIMAL(6,4),
    spread          DECIMAL(6,4),
    volume_24h      DECIMAL(18,2),
    recorded_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prices_market_time ON market_prices(market_id, recorded_at DESC);
CREATE INDEX idx_prices_recorded_at ON market_prices(recorded_at DESC);

-- TimescaleDB hypertable (если установлен)
-- SELECT create_hypertable('market_prices', 'recorded_at');

-- ============================================
-- Таблица: model_predictions (прогнозы модели)
-- ============================================
CREATE TABLE model_predictions (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    market_id       UUID REFERENCES markets(id),
    predicted_at    TIMESTAMPTZ DEFAULT NOW(),
    
    -- Сырые скоры модели
    raw_score_yes   DECIMAL(8,6),
    
    -- FLB-очищенная рыночная вероятность
    market_prob_clean DECIMAL(8,6),
    flb_method      VARCHAR(20),        -- 'shin', 'fl_glm', 'oo_epc'
    
    -- Venn-Abers калибровка
    venn_p0         DECIMAL(8,6),       -- нижняя граница (консервативная)
    venn_p1         DECIMAL(8,6),       -- верхняя граница
    venn_p_point    DECIMAL(8,6),       -- точечная оценка
    venn_uncertainty DECIMAL(8,6),      -- ширина интервала
    
    -- Сигнал
    ev              DECIMAL(8,6),
    kelly_fraction  DECIMAL(8,6),
    recommended_size DECIMAL(10,2),
    should_execute  BOOLEAN,
    
    -- Маркет данные на момент прогноза
    market_price_at_prediction DECIMAL(6,4),
    
    -- Постфактум результат
    was_correct     BOOLEAN,            -- NULL до разрешения
    actual_outcome  BOOLEAN
);

CREATE INDEX idx_predictions_market ON model_predictions(market_id, predicted_at DESC);
CREATE INDEX idx_predictions_execute ON model_predictions(should_execute, predicted_at DESC);

-- ============================================
-- Таблица: orders (ордера)
-- ============================================
CREATE TABLE orders (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    market_id       UUID REFERENCES markets(id),
    prediction_id   UUID REFERENCES model_predictions(id),
    
    -- Polymarket данные
    polymarket_order_id VARCHAR(200),
    token_id        VARCHAR(100) NOT NULL,
    side            VARCHAR(3) NOT NULL,    -- 'YES' or 'NO'
    
    -- Ценовые данные
    price           DECIMAL(6,4) NOT NULL,  -- заявленная цена
    size_usdc       DECIMAL(10,2) NOT NULL, -- размер в USDC
    filled_size     DECIMAL(10,2) DEFAULT 0,
    avg_fill_price  DECIMAL(6,4),
    
    -- Статус
    status          VARCHAR(20) DEFAULT 'PENDING',
    -- PENDING, OPEN, PARTIAL, FILLED, CANCELLED, EXPIRED
    
    -- Временные метки
    placed_at       TIMESTAMPTZ DEFAULT NOW(),
    filled_at       TIMESTAMPTZ,
    
    -- P&L
    pnl_usdc        DECIMAL(10,2),          -- NULL до разрешения
    
    -- Метаданные
    tx_hash         VARCHAR(100),           -- Polygon tx
    gas_cost        DECIMAL(10,6),
    notes           TEXT
);

CREATE INDEX idx_orders_market ON orders(market_id);
CREATE INDEX idx_orders_status ON orders(status, placed_at DESC);
CREATE INDEX idx_orders_placed ON orders(placed_at DESC);

-- ============================================
-- Таблица: pi_ratings (рейтинги команд)
-- ============================================
CREATE TABLE pi_ratings (
    id              BIGSERIAL PRIMARY KEY,
    team_name       VARCHAR(200) NOT NULL,
    league          VARCHAR(100),
    rating_home     DECIMAL(8,4) DEFAULT 0,
    rating_away     DECIMAL(8,4) DEFAULT 0,
    matches_played  INTEGER DEFAULT 0,
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_name, league)
);

CREATE INDEX idx_pi_ratings_league ON pi_ratings(league);

-- ============================================
-- Таблица: performance_metrics (дневная статистика)
-- ============================================
CREATE TABLE performance_metrics (
    id              BIGSERIAL PRIMARY KEY,
    date            DATE UNIQUE NOT NULL,
    
    -- Торговая статистика
    total_signals   INTEGER DEFAULT 0,
    executed_signals INTEGER DEFAULT 0,
    abstention_rate DECIMAL(6,4),
    
    -- Результаты
    wins            INTEGER DEFAULT 0,
    losses          INTEGER DEFAULT 0,
    win_rate        DECIMAL(6,4),
    
    -- Финансовые
    total_staked    DECIMAL(10,2) DEFAULT 0,
    total_returned  DECIMAL(10,2) DEFAULT 0,
    profit          DECIMAL(10,2) DEFAULT 0,
    roi             DECIMAL(8,4),
    
    -- Качество модели
    avg_ev          DECIMAL(8,6),
    avg_kelly       DECIMAL(8,6),
    avg_uncertainty DECIMAL(8,6),
    
    -- Банкролл
    bankroll_start  DECIMAL(10,2),
    bankroll_end    DECIMAL(10,2)
);

-- ============================================
-- Realtime Subscriptions (Supabase Realtime)
-- ============================================
ALTER TABLE orders REPLICA IDENTITY FULL;
ALTER TABLE market_prices REPLICA IDENTITY FULL;
ALTER TABLE model_predictions REPLICA IDENTITY FULL;

-- Публикации для realtime
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    orders, 
    market_prices, 
    model_predictions,
    performance_metrics;
COMMIT;

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_predictions ENABLE ROW LEVEL SECURITY;

-- Политика: только аутентифицированные пользователи
CREATE POLICY "Authenticated users only" ON orders
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users only" ON model_predictions
    FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- Полезные вьюхи
-- ============================================
CREATE OR REPLACE VIEW v_open_positions AS
SELECT 
    o.id,
    m.question,
    m.category,
    o.side,
    o.price,
    o.size_usdc,
    o.filled_size,
    o.status,
    o.placed_at,
    mp.yes_price AS current_yes_price,
    CASE 
        WHEN o.side = 'YES' THEN (mp.yes_price - o.price) / o.price * 100
        ELSE (o.price - mp.yes_price) / o.price * 100
    END AS unrealized_pnl_pct
FROM orders o
JOIN markets m ON o.market_id = m.id
LEFT JOIN LATERAL (
    SELECT yes_price 
    FROM market_prices 
    WHERE market_id = o.market_id 
    ORDER BY recorded_at DESC 
    LIMIT 1
) mp ON true
WHERE o.status IN ('OPEN', 'PARTIAL')
ORDER BY o.placed_at DESC;


CREATE OR REPLACE VIEW v_daily_performance AS
SELECT 
    DATE(placed_at) as trade_date,
    COUNT(*) as total_orders,
    SUM(CASE WHEN pnl_usdc > 0 THEN 1 ELSE 0 END) as wins,
    SUM(CASE WHEN pnl_usdc <= 0 THEN 1 ELSE 0 END) as losses,
    ROUND(AVG(CASE WHEN pnl_usdc IS NOT NULL THEN 
        CASE WHEN pnl_usdc > 0 THEN 1.0 ELSE 0.0 END 
    END)::numeric, 4) as win_rate,
    ROUND(SUM(size_usdc)::numeric, 2) as total_staked,
    ROUND(SUM(COALESCE(pnl_usdc, 0))::numeric, 2) as total_profit
FROM orders
WHERE status = 'FILLED'
GROUP BY DATE(placed_at)
ORDER BY trade_date DESC;
```

---

## 6. Codebase Blueprint — Python шаблоны

### 6.1 Polymarket CLOB Client (py_clob_client_v2)

```python
# services/polymarket_client.py
"""
Интеграция с Polymarket CLOB через py_clob_client_v2.
EIP-712 подпись + L1/L2 авторизация.
"""
import os
from py_clob_client.client import ClobClient
from py_clob_client.constants import POLYGON
from py_clob_client.clob_types import (
    OrderArgs, OrderType, MarketOrderArgs,
    PartialCreateOrderOptions
)
from py_clob_client.exceptions import PolyException

POLYMARKET_HOST = "https://clob.polymarket.com"
PRIVATE_KEY = os.getenv("POLYMARKET_PRIVATE_KEY")
CHAIN_ID = POLYGON  # 137


class PolySharkClient:
    
    def __init__(self):
        # L1 аутентификация (без API key)
        self.client = ClobClient(
            host=POLYMARKET_HOST,
            key=PRIVATE_KEY,
            chain_id=CHAIN_ID,
        )
        # Получаем/создаём L2 API credentials
        self.creds = self.client.create_or_derive_api_creds()
        
        # Переключаемся на L2 (для торговли)
        self.client = ClobClient(
            host=POLYMARKET_HOST,
            key=PRIVATE_KEY,
            chain_id=CHAIN_ID,
            creds=self.creds,
        )
    
    def get_markets(self, next_cursor: str = None) -> dict:
        """Получить список открытых рынков."""
        return self.client.get_markets(next_cursor=next_cursor)
    
    def get_orderbook(self, token_id: str) -> dict:
        """Получить стакан ордеров для токена."""
        return self.client.get_order_book(token_id)
    
    def get_midpoint(self, token_id: str) -> float:
        """Получить midpoint price (best_bid + best_ask) / 2."""
        book = self.get_orderbook(token_id)
        if book.asks and book.bids:
            best_ask = float(book.asks[0].price)
            best_bid = float(book.bids[0].price)
            return (best_ask + best_bid) / 2
        return None
    
    def place_limit_order(
        self,
        token_id: str,
        side: str,  # "BUY" or "SELL"
        price: float,
        size: float,
        order_type: OrderType = OrderType.GTC
    ) -> dict:
        """
        Разместить лимитный ордер.
        
        price: вероятность (0.01–0.99)
        size: количество shares (не USDC!)
        Для покупки YES на $50 при цене 0.65:
            size = 50 / 0.65 = 76.9 shares
        """
        order_args = OrderArgs(
            token_id=token_id,
            price=price,
            size=size,
            side=side,
        )
        
        try:
            signed_order = self.client.create_order(order_args)
            response = self.client.post_order(signed_order, order_type)
            return response
        except PolyException as e:
            return {"error": str(e), "order_id": None}
    
    def place_market_order(self, token_id: str, side: str, amount_usdc: float) -> dict:
        """
        Рыночный ордер на сумму amount_usdc USDC.
        Использует market order (немедленное исполнение).
        """
        market_order = MarketOrderArgs(
            token_id=token_id,
            amount=amount_usdc,
            side=side,
        )
        
        try:
            signed = self.client.create_market_order(market_order)
            return self.client.post_order(signed, OrderType.FOK)  # Fill or Kill
        except PolyException as e:
            return {"error": str(e)}
    
    def cancel_order(self, order_id: str) -> dict:
        """Отменить ордер."""
        return self.client.cancel(order_id=order_id)
    
    def get_positions(self) -> list:
        """Получить текущие позиции."""
        return self.client.get_positions()
    
    def get_balance(self) -> float:
        """Баланс USDC в кошельке."""
        balance = self.client.get_balance()
        return float(balance) / 1_000_000  # конвертация из wei (6 decimals)
```

### 6.2 WebSocket обработчик

```python
# services/ws_handler.py
"""
Real-time стриминг данных с Polymarket через WebSocket.
Минимальная латентность: использует uvloop + asyncio.
"""
import asyncio
import json
import logging
import uvloop
import websockets
from datetime import datetime
from typing import Callable

asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())

WS_URL = "wss://ws-subscriptions-clob.polymarket.com/ws/market"
logger = logging.getLogger("polyshark.ws")


class PolymarketWSHandler:
    
    def __init__(self, on_price_update: Callable, on_trade: Callable):
        self.on_price_update = on_price_update
        self.on_trade = on_trade
        self.subscribed_markets: set[str] = set()
        self.running = False
    
    async def subscribe(self, token_ids: list[str]) -> None:
        """Подписаться на обновления рынков."""
        self.subscribed_markets.update(token_ids)
    
    async def connect(self) -> None:
        """Главный цикл WebSocket соединения с автореконнектом."""
        self.running = True
        retry_delay = 1
        
        while self.running:
            try:
                async with websockets.connect(
                    WS_URL,
                    ping_interval=20,
                    ping_timeout=10,
                    max_size=10_000_000
                ) as ws:
                    logger.info("WebSocket connected to Polymarket CLOB")
                    retry_delay = 1
                    
                    # Подписка на рынки
                    if self.subscribed_markets:
                        await ws.send(json.dumps({
                            "type": "subscribe",
                            "channel": "market",
                            "assets_ids": list(self.subscribed_markets)
                        }))
                    
                    async for raw_message in ws:
                        await self._process_message(raw_message)
            
            except (websockets.exceptions.ConnectionClosed, 
                    ConnectionRefusedError) as e:
                logger.warning(f"WS disconnected: {e}. Retry in {retry_delay}s")
                await asyncio.sleep(retry_delay)
                retry_delay = min(retry_delay * 2, 30)
    
    async def _process_message(self, raw: str) -> None:
        """Обрабатывает входящее сообщение."""
        try:
            data = json.loads(raw)
            event_type = data.get("event_type") or data.get("type")
            
            if event_type == "price_change":
                await self._handle_price_change(data)
            elif event_type == "trade":
                await self._handle_trade(data)
            elif event_type == "book":
                await self._handle_book_update(data)
        
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON: {raw[:100]}")
        except Exception as e:
            logger.error(f"Message processing error: {e}")
    
    async def _handle_price_change(self, data: dict) -> None:
        update = {
            "token_id": data.get("asset_id"),
            "yes_price": float(data.get("price", 0)),
            "timestamp": datetime.utcnow().isoformat(),
            "raw": data
        }
        await self.on_price_update(update)
    
    async def _handle_trade(self, data: dict) -> None:
        trade = {
            "token_id": data.get("asset_id"),
            "price": float(data.get("price", 0)),
            "size": float(data.get("size", 0)),
            "side": data.get("side"),
            "timestamp": datetime.utcnow().isoformat(),
        }
        await self.on_trade(trade)
    
    async def _handle_book_update(self, data: dict) -> None:
        """Обновление стакана ордеров — источник spread/depth фич."""
        pass  # Реализуется под конкретную стратегию
    
    def stop(self) -> None:
        self.running = False
```

### 6.3 Главный агент-оркестратор

```python
# agents/orchestrator.py
"""
Мультиагентный оркестратор PolyShark AI.
Связывает: Data → Features → Model → Calibration → Risk → Execution.
"""
import asyncio
import logging
from datetime import datetime
from typing import Optional

from services.polymarket_client import PolySharkClient
from services.ws_handler import PolymarketWSHandler
from modules.flb_cleaner import fl_glm
from modules.calibration import PolySharkCalibrator
from modules.ev_kelly import generate_signal, TradeSignal
from database.supabase_client import SupabaseDB

logger = logging.getLogger("polyshark.orchestrator")


class PolySharkOrchestrator:
    
    def __init__(
        self,
        bankroll_usdc: float,
        prob_threshold: float = 0.80,
        ev_threshold: float = 0.05,
        dry_run: bool = True  # True = paper trading, не реальные ордера
    ):
        self.bankroll = bankroll_usdc
        self.prob_threshold = prob_threshold
        self.ev_threshold = ev_threshold
        self.dry_run = dry_run
        
        self.client = PolySharkClient()
        self.calibrator = PolySharkCalibrator(conservative=True)
        self.db = SupabaseDB()
        
        self.ws_handler = PolymarketWSHandler(
            on_price_update=self._on_price_update,
            on_trade=self._on_trade
        )
        
        self._active_markets: dict = {}
        self._signal_queue: asyncio.Queue = asyncio.Queue()
    
    async def start(self, market_ids: list[str]) -> None:
        """Запуск системы."""
        logger.info(f"PolyShark AI starting | Bankroll: ${self.bankroll} | DryRun: {self.dry_run}")
        
        # Загружаем рынки
        await self._load_markets(market_ids)
        
        # Запускаем конкурентные задачи
        await asyncio.gather(
            self.ws_handler.connect(),
            self._signal_processor(),
            self._heartbeat(),
        )
    
    async def _load_markets(self, market_ids: list[str]) -> None:
        """Загружает данные о рынках и подписывается на обновления."""
        for mid in market_ids:
            market_data = await asyncio.get_event_loop().run_in_executor(
                None, self.client.get_orderbook, mid
            )
            self._active_markets[mid] = market_data
        
        await self.ws_handler.subscribe(market_ids)
        logger.info(f"Subscribed to {len(market_ids)} markets")
    
    async def _on_price_update(self, update: dict) -> None:
        """Обработчик обновления цены — главный триггер анализа."""
        token_id = update["token_id"]
        current_price = update["yes_price"]
        
        if token_id not in self._active_markets:
            return
        
        # Асинхронный анализ в фоне
        asyncio.create_task(self._analyze_market(token_id, current_price))
    
    async def _analyze_market(self, token_id: str, current_price: float) -> None:
        """
        Полный pipeline анализа:
        raw_price → FLB clean → Model score → IVAP calibrate → EV/Kelly → Signal
        """
        try:
            # 1. FLB-очистка рыночной цены
            clean_probs = fl_glm([current_price, 1 - current_price])
            market_prob_clean = clean_probs[0]
            
            # 2. Получаем скор модели (заглушка — подставить реальную модель)
            raw_model_score = await self._get_model_score(token_id, current_price)
            
            if raw_model_score is None:
                return
            
            # 3. Калибровка IVAP
            import numpy as np
            calib_result = self.calibrator.predict(np.array([raw_model_score]))
            p0 = float(calib_result["p0"][0])
            p1 = float(calib_result["p1"][0])
            uncertainty = float(calib_result["uncertainty"][0])
            
            # 4. Генерация сигнала
            signal = generate_signal(
                market_id=token_id,
                token_id=token_id,
                side="YES",
                model_prob_p0=p0,
                market_price=current_price,
                bankroll=self.bankroll,
                ev_threshold=self.ev_threshold,
                prob_threshold=self.prob_threshold
            )
            
            # 5. Сохраняем предсказание в БД
            await self.db.save_prediction({
                "token_id": token_id,
                "venn_p0": p0,
                "venn_p1": p1,
                "venn_uncertainty": uncertainty,
                "market_prob_clean": market_prob_clean,
                "ev": signal.ev,
                "kelly_fraction": signal.kelly_fraction,
                "recommended_size": signal.recommended_size,
                "should_execute": signal.execute,
                "market_price_at_prediction": current_price,
            })
            
            # 6. Если сигнал — в очередь исполнения
            if signal.execute:
                await self._signal_queue.put(signal)
                logger.info(
                    f"🎯 SIGNAL: {token_id[:20]} | "
                    f"p0={p0:.3f} | EV={signal.ev:.3f} | "
                    f"Size=${signal.recommended_size:.2f}"
                )
        
        except Exception as e:
            logger.error(f"Analysis error for {token_id}: {e}")
    
    async def _signal_processor(self) -> None:
        """Очередь исполнения ордеров."""
        while True:
            signal: TradeSignal = await self._signal_queue.get()
            await self._execute_signal(signal)
    
    async def _execute_signal(self, signal: TradeSignal) -> None:
        """Исполняет торговый сигнал."""
        if self.dry_run:
            logger.info(f"[DRY RUN] Would place ${signal.recommended_size:.2f} "
                       f"on {signal.token_id[:20]} at {signal.market_price:.3f}")
            return
        
        result = await asyncio.get_event_loop().run_in_executor(
            None,
            self.client.place_market_order,
            signal.token_id,
            signal.side,
            signal.recommended_size
        )
        
        if "error" not in result:
            self.bankroll -= signal.recommended_size
            logger.info(f"✅ Order placed: {result}")
            await self.db.save_order(signal, result)
        else:
            logger.error(f"❌ Order failed: {result['error']}")
    
    async def _get_model_score(self, token_id: str, current_price: float) -> Optional[float]:
        """
        ЗАГЛУШКА: заменить на реальную ML-модель.
        Здесь должен быть вызов LightGBM/CatBoost с фичами из FeatureEngine.
        """
        # TODO: подключить FeatureEngine → LightGBM inference
        return None
    
    async def _on_trade(self, trade: dict) -> None:
        """Логирование сделок для обновления фич."""
        pass
    
    async def _heartbeat(self) -> None:
        """Мониторинг состояния системы."""
        while True:
            balance = await asyncio.get_event_loop().run_in_executor(
                None, self.client.get_balance
            )
            logger.info(f"💓 Heartbeat | Balance: ${balance:.2f} | Queue: {self._signal_queue.qsize()}")
            await asyncio.sleep(60)
```

---

## 7. Структура проекта

```
polyshark-ai/
│
├── agents/
│   ├── orchestrator.py          # Главный оркестратор
│   └── signal_aggregator.py     # Агрегация сигналов
│
├── modules/
│   ├── flb_cleaner.py           # FLB: Shin, FL-GLM, OO-EPC
│   ├── calibration.py           # Venn-Abers IVAP
│   ├── ev_kelly.py              # EV + Kelly sizing
│   └── features/
│       ├── pi_ratings.py        # Pi-Ratings (спорт)
│       ├── xg_sequence.py       # Sequence-Based xG (спорт)
│       └── market_features.py   # Крипто/политика фичи
│
├── models/
│   ├── trainer.py               # Walk-Forward обучение
│   ├── ensemble.py              # LightGBM + CatBoost ансамбль
│   └── validation.py            # Walk-Forward + Purging/Embargo
│
├── services/
│   ├── polymarket_client.py     # py_clob_client_v2 обёртка
│   └── ws_handler.py            # WebSocket стриминг
│
├── database/
│   ├── schema.sql               # DDL (этот файл)
│   └── supabase_client.py       # CRUD операции
│
├── dashboard/                   # Next.js дашборд
│   ├── pages/
│   └── components/
│
├── tests/
│   ├── test_calibration.py
│   ├── test_ev_kelly.py
│   └── test_flb.py
│
├── notebooks/
│   └── backtest.ipynb           # Jupyter для исследований
│
├── .env.example
├── requirements.txt
├── docker-compose.yml
└── README.md
```

---

## 8. Инструкции для Vibe-кодинга (пошаговый план)

### Промты для Cursor / Windsurf / Claude Code

Копируй промты в порядке очерёдности:

---

**Шаг 1: Инициализация проекта**
```
Create a Python project "polyshark-ai" with the following structure:
[вставь структуру из Module 7]
Initialize with:
- requirements.txt: py-clob-client, venn-abers, lightgbm, catboost, 
  supabase, fastapi, uvicorn, uvloop, websockets, redis, numpy, pandas, scipy
- .env.example with: POLYMARKET_PRIVATE_KEY, SUPABASE_URL, SUPABASE_KEY, 
  REDIS_URL, DRY_RUN=true, BANKROLL_USDC=500
- docker-compose.yml with: app, redis services
```

**Шаг 2: База данных**
```
Create database/schema.sql with the exact DDL from the specification.
Create database/supabase_client.py with async CRUD methods:
- save_prediction(data: dict) -> str  (returns UUID)
- save_order(signal: TradeSignal, result: dict) -> str
- get_recent_prices(token_id: str, hours: int = 24) -> list[dict]
- update_order_pnl(order_id: str, pnl: float) -> None
Use supabase-py async client.
```

**Шаг 3: Математическое ядро**
```
Implement modules/flb_cleaner.py with three functions:
1. shin_model(raw_odds: list[float]) -> list[float]
2. fl_glm(raw_odds: list[float], gamma: float = None) -> list[float]  
3. oo_epc(raw_odds: list[float]) -> list[float]
Add unit tests in tests/test_flb.py testing: sum of probabilities = 1.0,
probabilities in [0,1], FLB correction reduces longshot overpricing.
```

**Шаг 4: Калибровка**
```
Implement modules/calibration.py with PolySharkCalibrator class.
Use library: venn-abers (pip install venn-abers)
Methods: fit(scores, labels), predict(scores) -> dict with p0/p1/p_point/uncertainty
Add tests: calibrated probabilities must have lower Brier score than raw scores.
```

**Шаг 5: EV и Kelly**
```
Implement modules/ev_kelly.py with:
- calculate_ev(model_prob, market_price) -> float
- fractional_kelly(model_prob, market_price, bankroll, fraction=0.25) -> float
- generate_signal(...) -> TradeSignal dataclass
Add tests: kelly=0 when EV<0, kelly proportional to edge size.
```

**Шаг 6: Polymarket клиент**
```
Implement services/polymarket_client.py wrapping py-clob-client.
Methods: get_markets, get_orderbook, get_midpoint, 
         place_limit_order, place_market_order, cancel_order,
         get_positions, get_balance.
Add error handling for PolyException. 
Add retry logic (3 attempts, exponential backoff) for network errors.
```

**Шаг 7: WebSocket handler**
```
Implement services/ws_handler.py with PolymarketWSHandler class.
Use asyncio + uvloop + websockets library.
WS URL: wss://ws-subscriptions-clob.polymarket.com/ws/market
Handle: price_change, trade, book events.
Auto-reconnect with exponential backoff (max 30s).
```

**Шаг 8: ML модель (ансамбль)**
```
Implement models/ensemble.py with:
class PolySharkEnsemble:
  - fit(X_train, y_train): trains LightGBM + CatBoost, averages probabilities
  - predict_proba(X): returns averaged probability
  - save(path) / load(path): model persistence
Use Walk-Forward validation from modules/validation.py.
Feature importance logging.
```

**Шаг 9: Оркестратор**
```
Implement agents/orchestrator.py connecting all modules.
Pipeline: ws_update → analyze_market → flb_clean → model_score → 
          ivap_calibrate → ev_kelly → signal → execute
DRY_RUN mode: log signals without placing orders.
```

**Шаг 10: API + Дашборд**
```
Create FastAPI app in api/main.py with endpoints:
GET /status - system status, bankroll, positions count
GET /positions - open positions with unrealized PnL
GET /signals - recent signals (last 100)
GET /performance - daily metrics
POST /markets - add markets to watch list

Create Next.js dashboard in dashboard/ with:
- Real-time positions table (Supabase realtime subscription)
- Win rate gauge (target 80%)
- Daily P&L chart
- Recent signals feed with execute/skip status
```

**Шаг 11: Backtesting notebook**
```
Create notebooks/backtest.ipynb:
1. Load historical Polymarket data from API (last 6 months)
2. Run FLB cleaning on historical prices
3. Train ensemble model with Walk-Forward splits
4. Apply Venn-Abers calibration
5. Generate signals with 0.80 probability threshold
6. Calculate: win_rate, ROI, abstention_rate, Sharpe ratio
7. Plot: equity curve, win rate over time, EV distribution
```

---

## 9. Зависимости (requirements.txt)

```txt
# Polymarket
py-clob-client>=0.19.0

# ML
lightgbm>=4.3.0
catboost>=1.2.5
scikit-learn>=1.5.0

# Calibration
venn-abers>=1.3.0

# Database
supabase>=2.5.0
psycopg2-binary>=2.9.9

# API & Async
fastapi>=0.111.0
uvicorn[standard]>=0.30.0
uvloop>=0.19.0
websockets>=12.0

# Cache
redis>=5.0.4

# Data
numpy>=1.26.4
pandas>=2.2.2
scipy>=1.13.0

# Utils
python-dotenv>=1.0.1
pydantic>=2.7.1
structlog>=24.1.0

# Testing
pytest>=8.2.0
pytest-asyncio>=0.23.7
```

---

## 10. Ключевые метрики успеха

| Метрика | Порог запуска | Целевой уровень |
|---------|--------------|-----------------|
| Abstention rate | >60% | >75% |
| Win rate (executed) | >65% | ≥80% |
| Avg EV на сделку | >0.03 | >0.07 |
| Avg Venn uncertainty | <0.20 | <0.12 |
| Brier score | <0.22 | <0.18 |
| Monthly ROI | >5% | >15% |
| Max drawdown | <30% | <15% |

---

*PolyShark AI v1.0 — Senior Quant Architect Specification*  
*Generated: 2026-05-26 | Budget: $500 USDC | Mode: DRY_RUN first*
