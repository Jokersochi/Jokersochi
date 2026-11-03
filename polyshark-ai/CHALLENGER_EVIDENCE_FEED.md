# Challenger v2 — opt-in research evidence feed

This contract is **paper-only**. It never submits orders, authorizes capital,
or promises profitability. The configured feed is a locally provided,
manually reviewed set of independent probability estimates. No live news
provider or automatic prediction model is installed.

## Enable

Set `PAPER_CHALLENGER_EVIDENCE_FILE=/absolute/path/evidence.json` only
after provisioning the file on the runner. If it is unset, the daemon
clears any previously serialized `challenger_v2_evidence` and abstains.
If it is set but invalid/unreadable, the paper tick fails closed,
`capital_decision=NO_TRADE`, `review_status=BLOCKED`, and an error is logged.

The GitHub Actions scheduled runner does **not** set this variable. It will
continue operating in abstention mode until a vetted feed is explicitly
provisioned on a persistent runner. No credentials or source documents should
be committed to Git.

## Versioned JSON input

```json
{
  "schema_version": "challenger-research-feed-v1",
  "generated_at": "2026-11-03T00:00:00Z",
  "markets": [
    {
      "market_id": "REPLACE_WITH_ACTUAL_GAMMA_MARKET_ID",
      "question": "EXACT_MARKET_QUESTION",
      "sources": [
        {
          "source_url": "https://example.org/independent-forecast",
          "published_at": "2026-11-02T18:00:00Z",
          "observed_at": "2026-11-02T19:00:00Z",
          "probability_yes": 0.62,
          "independent_of_market_price": true,
          "reviewed_by": "REPLACE_WITH_REVIEWER_ID"
        }
      ]
    }
  ]
}
```

The illustrative example is **not** real event evidence and must not be
used for a trading decision. At least two different HTTPS source hostnames
with valid reviews and independent YES probabilities are required.
Do not convert market odds, CLOB midpoints, implied probabilities, or
another vendor's repackaged market prices into `probability_yes`.
The market question must match exactly (normalization only folds
case and whitespace). All timestamps require timezone offsets;
publication <= observation <= generation <= tick time.
Observations older than seven days are dropped.

Maximum payload: 256 KB, 100 markets, 12 sources per market. Unknown fields,
including `p_market`, cause rejection. On the same hostname only
the latest observation is retained; duplicate hostnames do not count as
separate sources. Filename and path are configuration, not a remote HTTP
endpoint. The feed never makes outbound requests.

**Important limitation:** HTTPS URL syntax and reviewer identity are
self-attested. This module does *not* verify article contents, source
independence across sister domains, publication authenticity, or quality
of subjective probabilities. Source verification and out-of-sample
calibration remain mandatory before any reviewed paper-execution change.
`REVIEW_ELIGIBLE` never enables orders.
