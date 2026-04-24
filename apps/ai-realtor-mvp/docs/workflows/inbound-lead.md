# inbound-lead

Flow:
1. Webhook Trigger
2. Normalize message
3. Upsert lead by source/external_id/phone
4. Save message
5. Classify lead
6. Generate reply
7. Send reply via channel adapter
8. Write audit log
9. Escalate owner if hot

TODO:
- Configure n8n credentials for app API and Telegram/WhatsApp adapters.
