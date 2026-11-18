"""Offline adversarial invariants for fee provenance, FIFO lock and finality."""
import copy
import importlib
import sys
import unittest
from pathlib import Path

runtime = Path(__file__).resolve().parents[1] / "runtime"
sys.path.insert(0, str(runtime))
econ = importlib.import_module("sandbox_economics")

T0 = "2026-11-17T12:00:00+00:00"
T1 = "2026-11-18T12:00:00+00:00"
T2 = "2026-11-19T00:00:00+00:00"
TBEFORE = "2026-11-16T10:00:00+00:00"
OFFICIAL = "https://gamma-api.polymarket.com/markets/abc"


def ledger():
    # Legacy synthetic fills: fees deliberately not separately reported.
    return {
        "paper_only": True, "real_orders_enabled": False,
        "capital_decision": "NO_TRADE",
        "cash": 997.55, "equity": 1000.05, "last_tick_at": T1,
        "trades": [
            {"market_id": "abc", "side": "BUY", "shares": 10,
             "price": 0.5, "cash_flow": -5.3, "at": T0},
            {"market_id": "abc", "side": "SELL", "shares": 5,
             "price": 0.6, "cash_flow": 2.85, "at": T1},
        ],
        "positions": {"abc": {"shares": 5, "last_liquidation_value": 2.5}},
    }


def claimed_fee(*, observed=TBEFORE, rate="0.07", platform="polymarket_international"):
    return {
        "market_id": "abc", "platform": platform, "source_url": OFFICIAL,
        "observed_at": observed, "valid_from": TBEFORE,
        "fees_enabled": True, "coefficient": rate,
    }


def one_legacy_buy():
    return {
        "paper_only": True, "real_orders_enabled": False,
        "capital_decision": "NO_TRADE",
        "cash": 994.775, "equity": 999.675, "last_tick_at": T1,
        "trades": [{
            "market_id": "abc", "side": "BUY", "shares": 10,
            "price": 0.5, "fee": 0.175, "slippage_reserve": 0.05,
            "cash_flow": -5.225, "at": T0, "execution_model": "orderbook_ladder_v1",
            "fill_legs": [{"price": "0.5", "shares": "10"}],
        }],
        "positions": {"abc": {"shares": 10, "last_liquidation_value": 4.9}},
    }


class EvidenceAwareEconomicsTests(unittest.TestCase):
    def test_no_provenance_does_not_claim_verified_fee_or_finality(self):
        result = econ.economics_report(ledger(), as_of=T2)
        self.assertEqual(result["economic_verdict"], "UNVERIFIED_NO_TRADE")
        self.assertEqual(result["fee_evidence"]["unknown_market_fee_records"], 2)
        self.assertEqual(result["fee_evidence"]["historically_verified_actual_fees"], 0)
        self.assertEqual(result["settlement_evidence"]["unverified_finality"], 1)
        self.assertEqual(result["open_cost_basis_locked"], 2.65)
        self.assertEqual(result["capital_decision"], "NO_TRADE")

    def test_opportunity_cost_is_rate_sensitive_and_not_in_cash(self):
        original = ledger()
        before = copy.deepcopy(original)
        result = econ.economics_report(original, as_of=T2)
        rates = result["opportunity_cost_scenarios"]
        self.assertEqual(rates["0"]["opportunity_cost_usd"], 0)
        self.assertGreater(rates["0.15"]["opportunity_cost_usd"],
                           rates["0.05"]["opportunity_cost_usd"])
        self.assertGreater(result["open_capital_usd_days"], 0)
        self.assertGreater(result["closed_capital_usd_days"], 0)
        self.assertEqual(original, before)

    def test_no_lookahead_as_of_before_last_tick(self):
        with self.assertRaisesRegex(ValueError, "predates"):
            econ.economics_report(ledger(), as_of=T0)

    def test_no_lookahead_trade_after_as_of(self):
        state = ledger()
        state["last_tick_at"] = T0
        with self.assertRaisesRegex(ValueError, "after as-of"):
            econ.economics_report(state, as_of=T0)

    def test_future_observed_fee_cannot_reclassify_historical_trade(self):
        result = econ.economics_report(
            ledger(), as_of=T2, evidence={"fee_records": [claimed_fee(observed=T2)]})
        self.assertEqual(result["fee_evidence"]["unknown_market_fee_records"], 2)

    def test_fee_record_does_not_verify_old_aggregated_fill(self):
        result = econ.economics_report(
            ledger(), as_of=T2, evidence={"fee_records": [claimed_fee()]})
        self.assertEqual(result["fee_evidence"]["unknown_market_fee_records"], 0)
        self.assertEqual(result["fee_evidence"]["model_only"], 2)
        self.assertEqual(result["fee_evidence"]["historically_verified_actual_fees"], 0)

    def test_fee_curve_reconciles_full_single_leg(self):
        result = econ.economics_report(
            one_legacy_buy(), as_of=T2,
            evidence={"fee_records": [claimed_fee()]})
        self.assertEqual(result["fee_evidence"]["model_reconciled"], 1)
        detail = result["fee_evidence"]["details"][0]
        self.assertEqual(detail["estimated_fee"], "0.17500")
        self.assertIn("NOT_EXECUTION_VERIFIED", detail["status"])

    def test_fee_rate_mismatch_not_passed_as_executed_fee(self):
        result = econ.economics_report(
            one_legacy_buy(), as_of=T2,
            evidence={"fee_records": [claimed_fee(rate="0.04")]})
        self.assertEqual(result["fee_evidence"]["details"][0]["status"],
                         "FEE_MODEL_MISMATCH")

    def test_fee_legs_must_balance_shares(self):
        state = one_legacy_buy()
        state["trades"][0]["fill_legs"][0]["shares"] = 9
        with self.assertRaisesRegex(ValueError, "legs do not match"):
            econ.economics_report(state, as_of=T2,
                                  evidence={"fee_records": [claimed_fee()]})

    def test_market_fee_evidence_must_be_from_correct_platform(self):
        with self.assertRaisesRegex(ValueError, "wrong platform"):
            econ.economics_report(
                ledger(), as_of=T2,
                evidence={"fee_records": [claimed_fee(platform="polymarket_us")]})

    def test_not_an_official_source_is_rejected(self):
        r = claimed_fee()
        r["source_url"] = "https://attack.example.com/fees"
        with self.assertRaisesRegex(ValueError, "official Polymarket"):
            econ.economics_report(ledger(), as_of=T2,
                                  evidence={"fee_records": [r]})

    def test_disabled_fee_market_cannot_claim_positive_rate(self):
        r = claimed_fee()
        r["fees_enabled"] = False
        with self.assertRaisesRegex(ValueError, "disabled"):
            econ.economics_report(ledger(), as_of=T2,
                                  evidence={"fee_records": [r]})

    def test_conflicting_fee_records_fail_closed(self):
        r1, r2 = claimed_fee(), claimed_fee(rate="0.05")
        with self.assertRaisesRegex(ValueError, "conflicting"):
            econ.economics_report(ledger(), as_of=T2,
                                  evidence={"fee_records": [r1, r2]})

    def test_finalized_user_supplied_outcome_is_hypothetical_only(self):
        state = ledger()
        before = copy.deepcopy(state)
        r = {"market_id": "abc", "status": "FINAL", "source_url": OFFICIAL,
             "observed_at": T2, "finalized_at": T1, "payout_per_share": "1"}
        result = econ.economics_report(
            state, as_of=T2, evidence={"settlements": {"abc": r}})
        self.assertEqual(result["settlement_evidence"]["user_supplied_finality"], 1)
        detail = result["settlement_evidence"]["details"][0]
        self.assertEqual(detail["hypothetical_payout"], "5")
        self.assertFalse(detail["capital_automatically_redeemed"])
        self.assertEqual(result["capital_decision"], "NO_TRADE")
        self.assertEqual(state, before)

    def test_future_resolution_observation_not_used(self):
        r = {"market_id": "abc", "status": "FINAL", "source_url": OFFICIAL,
             "observed_at": "2026-11-20T00:00:00+00:00",
             "finalized_at": T1, "payout_per_share": "1"}
        result = econ.economics_report(ledger(), as_of=T2,
                                       evidence={"settlements": {"abc": r}})
        self.assertEqual(result["settlement_evidence"]["unverified_finality"], 1)
        self.assertIsNone(result["settlement_evidence"]["details"][0]["hypothetical_payout"])

    def test_proposed_or_disputed_outcome_never_auto_settles(self):
        for status in ("PROPOSED", "DISPUTED"):
            with self.subTest(status=status):
                r = {"market_id": "abc", "status": status,
                     "source_url": OFFICIAL, "observed_at": T2,
                     "finalized_at": T1, "payout_per_share": "1"}
                res = econ.economics_report(ledger(), as_of=T2,
                                             evidence={"settlements": {"abc": r}})
                self.assertEqual(res["settlement_evidence"]["unverified_finality"], 1)

    def test_reject_negative_opportunity_rate(self):
        with self.assertRaisesRegex(ValueError, "below minimum"):
            econ.economics_report(ledger(), as_of=T2, annual_rates=["-0.05"])

    def test_reject_live_state(self):
        state = ledger()
        state["real_orders_enabled"] = True
        with self.assertRaisesRegex(Exception, "PAPER-only"):
            econ.economics_report(state, as_of=T2)


if __name__ == "__main__":
    unittest.main()
