import importlib.util
from pathlib import Path
import unittest

MODULE = Path(__file__).resolve().parents[1] / "runtime" / "research_contracts.py"
spec = importlib.util.spec_from_file_location("research_contracts", MODULE)
contracts = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(contracts)


class ResearchContractsTests(unittest.TestCase):
    def test_forecast_rejects_invalid_probability(self):
        forecast = contracts.ForecastOutput(
            probability=1.1,
            calibrated_probability=0.5,
            confidence=0.5,
            uncertainty=0.2,
            timestamp="2026-08-31T00:00:00+00:00",
        )
        with self.assertRaises(ValueError):
            forecast.validate()

    def test_no_trade_requires_reason(self):
        cost = contracts.CostEstimate(fees=0.01)
        dossier = contracts.TradeDossier(
            market_id="m1", question="Q", resolution_rule="official rule", resolution_source="official",
            market_price=0.50, bid=0.49, ask=0.51, spread=0.02, liquidity=10000, volume=5000,
            time_to_resolution_seconds=3600, crowd_probability=0.50, raw_model_probability=0.60,
            calibrated_probability=0.58, probability_uncertainty=0.10, agent_agreement=0.70,
            agent_disagreement=0.20, news_score=0.0, microstructure_score=0.1, fundamental_score=0.2,
            regime_score=0.8, estimated_edge=0.08, estimated_net_edge=0.07, expected_cost=cost,
            execution_probability=0.9, gross_ev=0.08, net_ev=0.07, risk_adjusted_ev=0.05,
            position_size=10, max_loss=10, portfolio_exposure=0.01, correlation_exposure=0.0,
            decision=contracts.Decision.NO_TRADE, confidence=0.7,
        )
        with self.assertRaises(ValueError):
            dossier.validate()

    def test_paper_only_fails_closed(self):
        with self.assertRaises(RuntimeError):
            contracts.require_paper_only({"paper_only": True, "real_orders_enabled": True})

    def test_equity_reconciliation(self):
        value = contracts.reconcile_equity(1000, -10, 5, 2, 3)
        self.assertEqual(value, 990)


if __name__ == "__main__":
    unittest.main()
