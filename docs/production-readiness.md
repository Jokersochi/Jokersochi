# Production Readiness Audit (Pilot на 1 объект)

Дата аудита: **2026-04-24**  
Область проверки: `app/api/*`, `lib/services/*`, `lib/adapters/*`, `db/migrations/*`.

## 1) Итоговый статус

**Общий статус:** `missing` (не готово к запуску пилота).  
В репозитории на момент проверки отсутствуют целевые директории (`app/api`, `lib/services`, `lib/adapters`, `db/migrations`) в рабочем коде приложения; найдено только совпадение в сторонней зависимости `node_modules`.

## 2) Чеклист readiness по блокам

| Блок | Статус | Комментарий |
|---|---|---|
| Security | `missing` | Нет выделенного API-слоя и адаптеров для централизованных authN/authZ, rate limiting, secret management, audit trail. |
| Reliability | `missing` | Нет сервисного слоя с retry/timeout/circuit breaker, идемпотентности, graceful degradation и SLO-ограничений. |
| Observability | `missing` | Нет стандартизованных структурированных логов/метрик/трейсов в целевой архитектуре модулей. |
| Cost | `missing` | Нет слоёв для контроля стоимости вызовов внешних API, лимитов, budget alerts, квот и отчётности. |
| Data integrity | `missing` | Нет миграций БД (`db/migrations/*`), схемных ограничений, версионирования и процедур восстановления данных. |
| Incident response | `partial` | Есть базовые артефакты проекта и workflow, но нет runbook/on-call, алертинга и формализованного incident process для целевых модулей. |

## 3) Проход по текущим модулям

| Модульный блок | Что найдено | Статус |
|---|---|---|
| `app/api/*` | Директория отсутствует | `missing` |
| `lib/services/*` | Директория отсутствует | `missing` |
| `lib/adapters/*` | Директория отсутствует (совпадение только в `node_modules`, не относится к прикладному коду) | `missing` |
| `db/migrations/*` | Директория отсутствует | `missing` |

## 4) P0-блокеры запуска пилота (must-fix до запуска)

1. **Отсутствует прикладной API-слой (`app/api/*`).**  
   Без него нет контролируемого периметра безопасности, валидации входных данных и версионирования API.
2. **Отсутствует сервисный слой (`lib/services/*`).**  
   Бизнес-логика не выделена, невозможно обеспечить устойчивость/идемпотентность/политику повторов.
3. **Отсутствует адаптерный слой (`lib/adapters/*`).**  
   Нет изоляции от внешних API/поставщиков, нет единообразной обработки ошибок и таймаутов.
4. **Отсутствуют миграции БД (`db/migrations/*`).**  
   Невозможен безопасный rollout схемы, контроль целостности и воспроизводимость окружений.
5. **Нет эксплуатационного контура (минимум observability + incident response).**  
   Для пилота на 1 объект обязательно: healthchecks, error budget/SLO-lite, alerting, runbook инцидентов.

## 5) План закрытия с приоритетами, владельцами и сроками

> Владельцы указаны как роли; замените на конкретных сотрудников.

### P0 (до запуска пилота)

| Приоритет | Задача | Владелец | Срок |
|---|---|---|---|
| P0 | Создать каркас `app/api/*` (routing, auth middleware, input validation, versioning) | Backend Lead | 2026-04-29 |
| P0 | Создать `lib/services/*` (business services, idempotency keys, retry/timeout policy) | Backend Lead | 2026-04-30 |
| P0 | Создать `lib/adapters/*` (external API adapters, unified error mapping, SLA timeouts) | Integrations Engineer | 2026-04-30 |
| P0 | Ввести `db/migrations/*` + baseline migration + rollback scripts | DB Engineer | 2026-04-29 |
| P0 | Настроить минимальную observability: structured logs, error metrics, uptime checks, alert routing | SRE/DevOps | 2026-05-01 |
| P0 | Подготовить Incident Runbook (классы инцидентов, эскалация, RTO/RPO, postmortem template) | Incident Manager / SRE | 2026-05-01 |

### P1 (первая неделя после пилота)

| Приоритет | Задача | Владелец | Срок |
|---|---|---|---|
| P1 | Внедрить security hardening: rate limiting, secret rotation, dependency scanning, audit logging | Security Engineer | 2026-05-08 |
| P1 | Добавить интеграционные тесты по слоям API/Service/Adapter + smoke migration tests | QA Lead | 2026-05-08 |
| P1 | Реализовать cost guardrails: per-endpoint budgets, quotas, usage dashboard | FinOps + Backend | 2026-05-10 |

### P2 (стабилизация и масштабирование)

| Приоритет | Задача | Владелец | Срок |
|---|---|---|---|
| P2 | Трассировка (OpenTelemetry), SLO dashboard, burn-rate alerts | SRE/DevOps | 2026-05-20 |
| P2 | Data governance: retention policy, PII classification, automated backup restore drills | Data Engineer | 2026-05-22 |
| P2 | Регулярные game days и chaos drills для инцидентов | SRE + Backend | 2026-05-24 |

## 6) Критерии перехода в `ready` для пилота на 1 объект

Минимальный gate в статус `ready`:
- все P0-задачи закрыты;
- есть успешно применяемая baseline migration и проверенный rollback;
- включены логи ошибок + алерты с подтверждённым каналом эскалации;
- есть runbook и назначенный on-call на период пилота;
- критические API endpoint’ы покрыты smoke/integration проверками.

