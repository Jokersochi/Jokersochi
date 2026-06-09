-- PolyShark AI — Supabase schema
-- Запуск: открыть Supabase SQL Editor и вставить весь файл.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "timescaledb";  -- опционально

-- ============================================
-- markets
-- ============================================
CREATE TABLE IF NOT EXISTS markets (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    polymarket_id   VARCHAR(100) UNIQUE NOT NULL,
    condition_id    VARCHAR(100),
    question        TEXT NOT NULL,
    category        VARCHAR(50),
    yes_token_id    VARCHAR(100),
    no_token_id     VARCHAR(100),
    resolution_date TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ,
    outcome         BOOLEAN,
    final_yes_price DECIMAL(6,4),
    total_volume    DECIMAL(18,2) DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    metadata        JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_markets_active        ON markets(is_active, resolution_date);
CREATE INDEX IF NOT EXISTS idx_markets_category      ON markets(category);
CREATE INDEX IF NOT EXISTS idx_markets_polymarket_id ON markets(polymarket_id);

-- ============================================
-- market_prices (time-series)
-- ============================================
CREATE TABLE IF NOT EXISTS market_prices (
    id            BIGSERIAL PRIMARY KEY,
    market_id     UUID REFERENCES markets(id) ON DELETE CASCADE,
    polymarket_id VARCHAR(100) NOT NULL,
    yes_price     DECIMAL(6,4) NOT NULL,
    no_price      DECIMAL(6,4) NOT NULL,
    best_ask_yes  DECIMAL(6,4),
    best_bid_yes  DECIMAL(6,4),
    spread        DECIMAL(6,4),
    volume_24h    DECIMAL(18,2),
    recorded_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(market_id, recorded_at)
);
CREATE INDEX IF NOT EXISTS idx_prices_market_time  ON market_prices(market_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_prices_recorded_at  ON market_prices(recorded_at DESC);
-- SELECT create_hypertable('market_prices', 'recorded_at');  -- TimescaleDB

-- ============================================
-- model_predictions
-- ============================================
CREATE TABLE IF NOT EXISTS model_predictions (
    id                         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    market_id                  UUID REFERENCES markets(id),
    predicted_at               TIMESTAMPTZ DEFAULT NOW(),
    raw_score_yes              DECIMAL(8,6),
    market_prob_clean          DECIMAL(8,6),
    flb_method                 VARCHAR(20),
    venn_p0                    DECIMAL(8,6),
    venn_p1                    DECIMAL(8,6),
    venn_p_point               DECIMAL(8,6),
    venn_uncertainty           DECIMAL(8,6),
    ev                         DECIMAL(8,6),
    kelly_fraction             DECIMAL(8,6),
    recommended_size           DECIMAL(10,2),
    should_execute             BOOLEAN,
    market_price_at_prediction DECIMAL(6,4),
    was_correct                BOOLEAN,
    actual_outcome             BOOLEAN
);
CREATE INDEX IF NOT EXISTS idx_predictions_market  ON model_predictions(market_id, predicted_at DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_execute ON model_predictions(should_execute, predicted_at DESC);

-- ============================================
-- orders
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
    id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    market_id           UUID REFERENCES markets(id),
    prediction_id       UUID REFERENCES model_predictions(id),
    polymarket_order_id VARCHAR(200),
    token_id            VARCHAR(100) NOT NULL,
    side                VARCHAR(3) NOT NULL,
    price               DECIMAL(6,4) NOT NULL,
    size_usdc           DECIMAL(10,2) NOT NULL,
    filled_size         DECIMAL(10,2) DEFAULT 0,
    avg_fill_price      DECIMAL(6,4),
    status              VARCHAR(20) DEFAULT 'PENDING',
    placed_at           TIMESTAMPTZ DEFAULT NOW(),
    filled_at           TIMESTAMPTZ,
    pnl_usdc            DECIMAL(10,2),
    tx_hash             VARCHAR(100),
    gas_cost            DECIMAL(10,6),
    notes               TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_market  ON orders(market_id);
CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders(status, placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_placed  ON orders(placed_at DESC);

-- ============================================
-- pi_ratings
-- ============================================
CREATE TABLE IF NOT EXISTS pi_ratings (
    id             BIGSERIAL PRIMARY KEY,
    team_name      VARCHAR(200) NOT NULL,
    league         VARCHAR(100),
    rating_home    DECIMAL(8,4) DEFAULT 0,
    rating_away    DECIMAL(8,4) DEFAULT 0,
    matches_played INTEGER DEFAULT 0,
    updated_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_name, league)
);
CREATE INDEX IF NOT EXISTS idx_pi_ratings_league ON pi_ratings(league);

-- ============================================
-- performance_metrics
-- ============================================
CREATE TABLE IF NOT EXISTS performance_metrics (
    id               BIGSERIAL PRIMARY KEY,
    date             DATE UNIQUE NOT NULL,
    total_signals    INTEGER DEFAULT 0,
    executed_signals INTEGER DEFAULT 0,
    abstention_rate  DECIMAL(6,4),
    wins             INTEGER DEFAULT 0,
    losses           INTEGER DEFAULT 0,
    win_rate         DECIMAL(6,4),
    total_staked     DECIMAL(10,2) DEFAULT 0,
    total_returned   DECIMAL(10,2) DEFAULT 0,
    profit           DECIMAL(10,2) DEFAULT 0,
    roi              DECIMAL(8,4),
    avg_ev           DECIMAL(8,6),
    avg_kelly        DECIMAL(8,6),
    avg_uncertainty  DECIMAL(8,6),
    bankroll_start   DECIMAL(10,2),
    bankroll_end     DECIMAL(10,2)
);

-- ============================================
-- Realtime
-- ============================================
ALTER TABLE orders             REPLICA IDENTITY FULL;
ALTER TABLE market_prices      REPLICA IDENTITY FULL;
ALTER TABLE model_predictions  REPLICA IDENTITY FULL;

BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE
    orders, market_prices, model_predictions, performance_metrics;
COMMIT;

-- ============================================
-- RLS
-- ============================================
ALTER TABLE orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_predictions  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users only" ON orders;
CREATE POLICY "Authenticated users only" ON orders
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users only" ON model_predictions;
CREATE POLICY "Authenticated users only" ON model_predictions
    FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- View: открытые позиции
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
    o.placed_at
FROM orders o
JOIN markets m ON m.id = o.market_id
WHERE o.status IN ('PENDING', 'OPEN', 'PARTIAL');
