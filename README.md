# 🃏 Jokersochi's GitHub Profile

Привет! Я Jokersochi, и это мой профиль на GitHub.

## 🛠️ Обо мне

Я разработчик, который фокусируется на создании современных, оптимизированных и производительных веб-приложений. Мои интересы включают:
*   **Frontend-разработка:** React, Vue, Nuxt.js, Vite.
*   **AI/ML:** Интеграция больших языковых моделей (LLM) и генеративных моделей (Gemini, ComfyUI).
*   **Оптимизация производительности:** PWA, Web Vitals, Lighthouse.

## ✨ Избранные проекты

| Репозиторий | Описание | Технологии |
| :--- | :--- | :--- |
| **[primerochnaya](https://github.com/Jokersochi/primerochnaya)** | Виртуальная примерка одежды с использованием AI. | React, TypeScript, Gemini API |
| **[Wan2.2](https://github.com/Jokersochi/Wan2.2)** | Open and Advanced Large-Scale Video Generative Models. | Python, PyTorch, Video Generation |
| **[Product-Visualizer-AI](https://github.com/Jokersochi/Product-Visualizer-AI)** | AI-инструмент для визуализации продуктов. | React, AI |
| **[russian-monopoly-local](https://github.com/Jokersochi/russian-monopoly-local)** | Прототип браузерной игры "Монополия" с российской тематикой. | JavaScript, HTML, CSS |
| **[codesandbox-template-nuxt](https://github.com/Jokersochi/codesandbox-template-nuxt)** | Шаблон Nuxt.js для CodeSandbox. | Nuxt.js, Vue.js |

## 🚀 Улучшения в этом Pull Request

*   **Улучшена структура проекта:** Добавлены файлы `.gitignore` и `.nvmrc` для лучшей совместимости и управления зависимостями.
*   **Очистка зависимостей:** Удалена неиспользуемая зависимость `http-server` и устаревшие скрипты `old:build`, `old:dev`, `old:serve` из `package.json`.
*   **Актуализация документации:** Обновлен `README.md` для профиля с информацией о проектах.

## 🔐 Deployment environments (Vercel + Supabase)

Для безопасного разделения окружений используются три независимых проекта:

1. `dev` — отдельный Vercel Project + отдельный Supabase project.
2. `staging` — отдельный Vercel Project + отдельный Supabase project.
3. `prod` — отдельный Vercel Project + отдельный Supabase project.

Секреты из `.env.example` не хранятся в git и должны быть загружены в environment secrets каждого окружения (Vercel Environment Variables / Supabase secrets).

### Env matrix

| Переменная | dev | staging | prod | Обязательность |
| :--- | :---: | :---: | :---: | :--- |
| `NODE_ENV` | ✅ | ✅ | ✅ | required |
| `PORT` | ✅ | ✅ | ✅ | required |
| `VERCEL_PROJECT_ID` | ✅ | ✅ | ✅ | required |
| `VERCEL_ORG_ID` | ✅ | ✅ | ✅ | required |
| `VERCEL_TOKEN` | ✅ | ✅ | ✅ | required |
| `SUPABASE_URL` | ✅ | ✅ | ✅ | required |
| `SUPABASE_ANON_KEY` | ✅ | ✅ | ✅ | required |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | ✅ | ✅ | required |
| `TELEGRAM_BOT_TOKEN` | ✅ | ✅ | ✅ | optional |
| `TELEGRAM_CHAT_ID` | ✅ | ✅ | ✅ | optional |
| `WHATSAPP_ACCESS_TOKEN` | ✅ | ✅ | ✅ | optional |
| `WHATSAPP_PHONE_NUMBER_ID` | ✅ | ✅ | ✅ | optional |

> Поведение API при отсутствии Telegram/WhatsApp ключей: возвращается статус `not_configured` (без 500).

## 🤝 Связь со мной

Вы можете связаться со мной через GitHub.

---
*Этот README был автоматически сгенерирован и улучшен AI-агентом Manus.*
