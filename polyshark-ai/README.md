# 🦈 PolyShark AI

> Автономный мультиагентный торговый сервис для Polymarket  
> **Цель:** Selective Win Rate ≥ 80% через математическое право на воздержание

## Архитектура

```
Data Stream → Feature Engine → ML Ensemble → Venn-Abers → EV/Kelly → Execute
```

## Быстрый старт

### 1. Клонирование и настройка
```bash
cp .env.example .env
# Заполни .env своими ключами (MetaMask, Supabase, Alchemy)
```

### 2. База данных
```bash
# Открой Supabase Dashboard → SQL Editor
# Выполни: database/schema.sql
```

### 3. Запуск через Docker
```bash
docker-compose up -d redis    # сначала Redis
docker-compose up app         # API + агент
```

### 4. Paper trading (обязательно сначала!)
```bash
python runtime/paper_trader.py --state runtime/paper_state.json
```

Автономный runtime работает только с публичными API и жёстко сохраняет
`paper_only: true` / `real_orders_enabled: false`. Стратегия v3 не копирует
одного лидера: она требует устойчивого рейтинга в нескольких периодах,
минимум два независимых текущих голоса, свежий net-buy и цену не хуже чем на
3 цента выше средней цены лидеров. Методика и выборка описаны в
[`research/top-trader-analysis-2026-08-29.md`](research/top-trader-analysis-2026-08-29.md).

## Ключевые метрики перехода в прод

| Метрика | Порог |
|---------|-------|
| Win Rate | ≥ 70% на paper |
| Abstention Rate | ≥ 60% |
| Avg EV | > 0.05 |
| Brier Score | < 0.22 |

## Модули

| Файл | Функция |
|------|---------|
| `modules/flb_cleaner.py` | Очистка FLB (Shin/FL-GLM/OO-EPC) |
| `modules/calibration.py` | Venn-Abers IVAP калибровка |
| `modules/ev_kelly.py` | EV + дробный Kelly |
| `modules/validation.py` | Walk-Forward + Purging/Embargo |
| `services/polymarket_client.py` | CLOB API (EIP-712) |
| `services/ws_handler.py` | WebSocket стриминг |
| `runtime/leader_consensus.py` | Публичный рейтинг, позиции, flow и consensus v3 |
| `runtime/paper_trader.py` | Только виртуальное исполнение и риск-контроль |
| `agents/orchestrator.py` | Главный агент |
| `database/schema.sql` | Supabase DDL |

## Структура файлов
```
polyshark-ai/
├── agents/          # Оркестратор
├── modules/         # Математическое ядро
│   └── features/    # Feature engineering
├── models/          # ML модели (LightGBM + CatBoost)
├── services/        # Polymarket API + WebSocket
├── database/        # Supabase schema + client
├── api/             # FastAPI (дашборд)
├── tests/           # Unit тесты
└── notebooks/       # Backtesting (Jupyter)
```

## Важно

⚠️ **НИКОГДА** не запускай с реальными деньгами без минимум 2 недель paper trading  
⚠️ **НИКОГДА** не храни приватный ключ в git (добавь `.env` в `.gitignore`)  
⚠️ Максимальная paper-позиция: 2% equity; весь открытый book — не более 8%
