# n8n workflow skeletons

## Что добавлено
- `workflows/inbound-lead-e2e.json` — inbound lead e2e: webhook → API → reply → audit → escalation.
- `workflows/reminders-15min.json` — напоминания по cron каждые 15 минут.
- `workflows/daily-report-2000.json` — ежедневный отчёт по cron в 20:00.

Каждый workflow содержит failure branch с шаблоном: `retry -> alert -> DLQ`.

## Импорт JSON skeletons
1. В n8n откройте **Workflows → Import from file**.
2. Поочерёдно импортируйте 3 JSON файла из каталога `n8n/workflows/`.
3. Проверьте, что workflows импортированы в статусе `inactive`.

## Настройка credentials
После импорта назначьте credentials в каждом HTTP узле.

Рекомендуемые имена credentials в n8n:
- `LEAD_API_CREDENTIAL`
- `REMINDER_API_CREDENTIAL`
- `REPORT_API_CREDENTIAL`
- `AUDIT_API_CREDENTIAL`
- `ALERT_API_CREDENTIAL`
- `DLQ_API_CREDENTIAL`

## Переменные окружения (n8n)
Добавьте/проверьте переменные в окружении n8n:
- `LEAD_API_BASE_URL`
- `REMINDER_API_BASE_URL`
- `REPORT_API_BASE_URL`
- `AUDIT_API_BASE_URL`
- `ALERT_API_BASE_URL`
- `DLQ_API_BASE_URL`

## Рекомендованный smoke test
1. Активировать только `Inbound Lead E2E`.
2. Отправить тестовый POST на `/webhook/inbound-lead`.
3. Проверить:
   - ответ 202 на успешной ветке;
   - запись в аудит;
   - эскалацию для `source=enterprise`;
   - на ошибке: retry, затем alert и DLQ.
