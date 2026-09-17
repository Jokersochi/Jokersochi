import importlib.util
from dataclasses import FrozenInstanceError, replace
from pathlib import Path
import sys
import unittest

MODULE = Path(__file__).resolve().parents[1] / "runtime" / "research_contracts.py"
spec = importlib.util.spec_from_file_location("research_contracts", MODULE)
contracts = importlib.util.module_from_spec(spec)
assert spec.loader is not None
sys.modules[spec.name] = contracts
spec.loader.exec_module(contracts)

NOW = "2026-08-31T00:00:00+00:00"


def evidence(**changes):
    values = dict(
        evidence_id="e1",
        source="fixture",
        source_uri="https://example.test/source",
        observed_at="2026-08-30T22:00:00+00:00",
        retrieved_at="2026-08-30T23:00:00+00:00",
        content_hash="sha256:fixture",
    )
    values.update(changes)
    return contracts.EvidenceRecord(**values)


def forecast(**changes):
    values = dict(
        forecast_id="f1",
        market_id="m1",
        outcome=contracts.Outcome.YES,
        model_version="challenger-fixture",
        calibration_version="cal-fixture",
        probability=0.60,
        calibrated_probability=0.58,
        confidence=0.70,
        uncertainty=0.20,
        created_at=NOW,
        input_cutoff_at="2026-08-30T23:30:00+00:00",
        evidence=(evidence(),),
        source_quality=0.8,
        regime="fixture",
        data_quality=0.9,
    )
    values.update(changes)
    return contracts.ForecastOutput(**values)


def dossier(**changes):
    values = dict(
        dossier_id="d1",
        forecast_id="f1",
        market_id="m1",
        outcome=contracts.Outcome.YES,
        question="Fixture?",
        resolution_rule="Official rule",
        resolution_source="Official source",
        decision_at=NOW,
        market_price=0.50,
        bid=0.49,
        ask=0.51,
        spread=0.02,
        liquidity=10000,
        volume=5000,
        time_to_resolution_seconds=3600,
        crowd_probability=0.50,
        raw_model_probability=0.60,
        calibrated_probability=0.58,
        probability_uncertainty=0.10,
        agent_agreement=0.70,
        agent_disagreement=0.20,
        news_score=0.0,
        microstructure_score=0.1,
        fundamental_score=0.2,
        regime_score=0.8,
        estimated_edge=0.07,
        estimated_net_edge=0.06,
        expected_cost=contracts.CostEstimate(
            fees=0.01, model_version="cost-fixture", quote_timestamp=NOW
        ),
        execution_probability=0.9,
        gross_ev=0.07,
        net_ev=0.06,
        risk_adjusted_ev=0.05,
        position_size=10,
        max_loss=10,
        portfolio_exposure=0.01,
        correlation_exposure=0.0,
        decision=contracts.Decision.TRADE,
        confidence=0.7,
    )
    values.update(changes)
    return contracts.TradeDossier(**values)


class ForecastContractTests(unittest.TestCase):
    def test_valid_forecast(self):
        forecast().validate()

    def test_rejects_nonfinite_and_bool_probabilities(self):
        for value in (float("nan"), float("inf"), True, "0.5"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                forecast(probability=value).validate()

    def test_rejects_invalid_or_naive_timestamps(self):
        for value in ("nonsense", "2026-08-31T00:00:00"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                forecast(created_at=value).validate()

    def test_rejects_missing_or_mutable_evidence(self):
        for records in ((), ({"source": "mutable"},)):
            with self.subTest(records=records), self.assertRaises(ValueError):
                forecast(evidence=records).validate()

    def test_rejects_lookahead_evidence(self):
        late = evidence(retrieved_at="2026-08-31T01:00:00+00:00")
        with self.assertRaisesRegex(ValueError, "look-ahead"):
            forecast(evidence=(late,)).validate()

    def test_evidence_is_immutable(self):
        record = evidence()
        with self.assertRaises(FrozenInstanceError):
            record.source = "changed"


class DossierContractTests(unittest.TestCase):
    def test_valid_trade(self):
        dossier().validate()

    def test_decision_and_reason_require_enums(self):
        for changes in (
            {"decision": "NO_TRADE"},
            {"decision": "BANANA"},
            {"rejection_reason": "RISK_LIMIT"},
        ):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                dossier(**changes).validate()

    def test_no_trade_requires_reason_and_zero_executable_risk(self):
        base = dict(decision=contracts.Decision.NO_TRADE, position_size=0, max_loss=0)
        with self.assertRaisesRegex(ValueError, "reason"):
            dossier(**base).validate()
        with self.assertRaisesRegex(ValueError, "zero"):
            dossier(**{**base, "rejection_reason": contracts.RejectReason.RISK_LIMIT, "position_size": 1}).validate()
        dossier(**base, rejection_reason=contracts.RejectReason.RISK_LIMIT).validate()

    def test_bad_resolution_can_be_recorded_as_no_trade(self):
        dossier(
            decision=contracts.Decision.NO_TRADE,
            rejection_reason=contracts.RejectReason.BAD_RESOLUTION_RULE,
            resolution_rule="",
            resolution_source="",
            position_size=0,
            max_loss=0,
        ).validate()

    def test_rejects_negative_or_nonfinite_cost_and_risk(self):
        bad_cases = (
            {"expected_cost": replace(dossier().expected_cost, fees=-0.01)},
            {"position_size": -1},
            {"net_ev": float("nan")},
        )
        for changes in bad_cases:
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                dossier(**changes).validate()

    def test_rejects_inconsistent_spread_edge_and_ev(self):
        for changes in (
            {"spread": 0.03},
            {"estimated_edge": 0.99},
            {"gross_ev": 0.99},
            {"net_ev": 0.05},
        ):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                dossier(**changes).validate()

    def test_float_rounding_uses_tolerance(self):
        dossier(
            bid=0.48,
            ask=0.50,
            spread=0.02,
            calibrated_probability=0.53,
            estimated_edge=0.03,
            expected_cost=contracts.CostEstimate(
                fees=0.02, model_version="cost-fixture", quote_timestamp=NOW
            ),
            estimated_net_edge=0.01,
            gross_ev=0.03,
            net_ev=0.01,
            risk_adjusted_ev=0.005,
        ).validate()


class SafetyAndLedgerTests(unittest.TestCase):
    def test_paper_only_accepts_only_explicit_canonical_flags(self):
        contracts.require_paper_only({
            "paper_only": True,
            "real_orders_enabled": False,
            "real_money": False,
            "live_trading": False,
        })

    def test_paper_only_fails_closed(self):
        valid = {
            "paper_only": True,
            "real_orders_enabled": False,
            "real_money": False,
            "live_trading": False,
        }
        cases = (
            {},
            {**valid, "real_orders_enabled": 0},
            {**valid, "real_orders_enabled": "false"},
            {**valid, "real_money": True},
            {**valid, "live_trading": True},
            {**valid, "DRY_RUN": False},
        )
        for state in cases:
            with self.subTest(state=state), self.assertRaises(RuntimeError):
                contracts.require_paper_only(state)

    def test_net_pnl_equity_does_not_double_count_fees(self):
        self.assertEqual(contracts.reconcile_equity(1000, -10, 5), 995)

    def test_equity_cross_check_detects_either_ledger_mismatch(self):
        contracts.assert_equity_reconciled(
            recorded_equity=990,
            cash=900,
            open_position_value=90,
            starting_equity=1000,
            realized_net_pnl=-5,
            unrealized_net_pnl=-5,
        )
        with self.assertRaises(ValueError):
            contracts.assert_equity_reconciled(
                recorded_equity=990,
                cash=900,
                open_position_value=80,
                starting_equity=1000,
                realized_net_pnl=-5,
                unrealized_net_pnl=-5,
            )


if __name__ == "__main__":
    unittest.main()
