# viewing-scheduler

1. Load lead by id.
2. Check phone presence.
3. If missing phone: send phone request + wait for response.
4. Generate 2-3 slot options (10:00-18:00, +2h minimum, 45 min).
5. Offer slots to lead.
6. On slot confirmation create `viewings` with `awaiting_confirmation`.
7. Wait for T-2h confirmation.
8. If no confirmation auto-cancel and write audit log.
