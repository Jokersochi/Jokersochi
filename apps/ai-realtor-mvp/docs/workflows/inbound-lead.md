# inbound-lead

1. Webhook Trigger (channel message).
2. Normalize message payload (name/channel/source/property_id).
3. Create lead in `leads` + first row in `lead_messages`.
4. OpenAI classify step (`classify.user.txt`).
5. OpenAI reply step (`seller.system.txt` + `schedule.user.txt` when needed).
6. Send reply via channel connector.
7. Write `audit_logs` entry with classification + action outcome.
