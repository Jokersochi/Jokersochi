# Концепция и прототип приложения виртуального подбора макияжа на базе Nano Banana

## 1. Цели продукта
- Позволить визажистам и клиентам быстро примерять различные варианты макияжа на реальных фотографиях.
- Сократить время согласования образов и повысить конверсию в запись на услугу.
- Предоставить удобную площадку для расширения базы визажистов и продвижения их портфолио.

## 2. Целевая аудитория
- **Клиенты**: люди, планирующие визит к визажисту или подбирающие образ для мероприятия.
- **Визажисты и салоны**: специалисты, которые хотят демонстрировать услуги и собирать отзывы.
- **Бренды косметики**: партнёры, готовые интегрировать продукцию в шаблоны макияжа.

## 3. Пользовательские сценарии
1. Клиент загружает фото, выбирает шаблон («натуральный», «smoky eyes» и др.), получает визуализацию, сохраняет или отправляет визажисту.
2. Визажист создаёт индивидуальные наборы макияжа, добавляет описания и ссылки на бронирование.
3. Бренд запускает промо-коллекцию с предустановленными эффектами и отслеживает статистику.

## 4. Продуктовые требования
- Поддержка загрузки изображений в форматах JPG/PNG.
- Библиотека шаблонов макияжа с описаниями и параметрами.
- Возможность генерации запроса к модели Nano Banana на основе выбранного шаблона.
- Просмотр результата «до/после», загрузка обработанного изображения.
- Личный кабинет визажиста: управление шаблонами, ссылками на запись, аналитикой.
- Отложенное расширение: мобильное приложение (React Native/Flutter), AR-режим, подписка.

## 5. Архитектура
```
┌─────────────┐      ┌────────────────────┐      ┌─────────────────────┐
│  Frontend   │ ───▶ │  BFF/API сервер    │ ───▶ │  Google Gemini API  │
│ (Web/Mobile)│      │(FastAPI/Express)   │      │  (Nano Banana)      │
└─────────────┘      └────────────────────┘      └─────────────────────┘
       │                       │                          │
       ▼                       ▼                          
┌─────────────┐      ┌────────────────────┐
│   Storage   │      │   Auth & Billing   │
│ (S3/GCS)    │      │(Firebase/Auth0)    │
└─────────────┘      └────────────────────┘
```

### Основные компоненты
- **Frontend**: Streamlit для прототипа; позже — React/Next.js или Flutter.
- **BFF/API**: Python (FastAPI) или Node.js (Express) для валидации запросов и проксирования к Nano Banana.
- **Хранилище**: S3/Google Cloud Storage для исходных и обработанных фото.
- **База данных**: Firestore/Supabase для профилей, шаблонов, истории.
- **Аутентификация**: Firebase Auth, OAuth (Google/Apple), роли «клиент/визажист/админ».
- **Аналитика**: Mixpanel/Amplitude, экспорт отчётов для визажистов.

## 6. План разработки
1. **Исследование**: UX-опросы, подбор 10–15 шаблонов, тестирование промптов для Nano Banana.
2. **Прототип**: Streamlit-приложение (MVP), интеграция с Gemini API, локальное хранение.
3. **Пилот**: Добавление аккаунтов визажистов, систем уведомлений, оплаты (Stripe/YooMoney).
4. **Релиз**: Перенос на production-стек (Next.js + FastAPI), полноценное хранение, аналитика.
5. **Рост**: AR Try-On, мобильные приложения, партнёрские программы с брендами косметики.

## 7. Интеграция Nano Banana (Gemini 2.5 Flash Image)
- Получить API-ключ в Google AI Studio, включить биллинг.
- Использовать модель `gemini-2.5-flash-image` для редактирования лиц.
- Передавать изображение в base64 и текстовый промпт с описанием желаемого макияжа.
- Настраивать системный промпт для стабильных результатов (например, фиксировать стиль ретуши).

### Примеры шаблонов макияжа
| Название | Промпт |
|----------|--------|
| Натуральный дневной | `Apply light foundation matching skin tone, nude lipstick, subtle brown mascara and blush to this person's face, keep natural features, photorealistic.` |
| Smokey eyes вечерний | `Add dramatic black smoky eyeshadow, winged black eyeliner, bold red matte lips, contoured cheeks to this face, evening glam style, photorealistic.` |
| Розовый голливуд | `Apply glowing foundation, pink glossy lips, shimmering pink eyeshadow, highlighted cheekbones to this person's face, Hollywood red carpet look, realistic lighting.` |
| Золотой шиммер | `Add golden shimmery eyeshadow, bronzer, peachy lips, false lashes to this face, warm tones, festival vibe, photorealistic.` |
| Классический красный | `Apply flawless base, classic red lipstick, cat-eye liner, neutral shadow to this person's face, timeless elegance, high resolution.` |
| Матовый минимализм | `Light matte foundation, soft pink lips, barely-there brows and liner, natural glow on this face, minimalist style, photorealistic.` |
| Яркий Y2K | `Bold blue eyeshadow, glossy lips, heavy blush, fun 2000s vibe on this person's face, retro pop, detailed and vibrant.` |
| Зеленый драма | `Emerald green eyeshadow, black liner, nude lips, sculpted face on this face, mysterious evening look, realistic.` |
| Персиковый летний | `Peach blush, coral lips, soft brown shadow, sun-kissed skin on this person's face, summer fresh, photorealistic.` |
| Глиттер party | `Sparkly silver glitter eyes, purple lips, heavy contour, party ready on this face, fun and bold, high detail.` |

## 8. Пример прототипа на Streamlit
Готовый код прототипа вынесен в отдельный модуль `apps/virtual_makeup/makeup_app.py`. Он включает:

- авторизацию через `GOOGLE_API_KEY` (поддержка `st.secrets` и переменных окружения);
- набор преднастроенных шаблонов макияжа в виде датаклассов;
- слайдер интенсивности и поле для дополнительных пожеланий клиента;
- обработку ошибок подключения к Nano Banana и удобную выдачу результата «до/после»;
- кнопку скачивания итогового изображения.

Запуск:

```bash
pip install streamlit google-generativeai pillow
streamlit run apps/virtual_makeup/makeup_app.py
```

## 9. Безопасность и этика
- Хранение изображений только с согласия пользователя, автоудаление через 24 часа.
- Фильтрация контента: отклонять изображения без лиц или с несанкционированными лицами.
- Журналирование всех обращений к API для отслеживания злоупотреблений.
- Соблюдение GDPR/ФЗ-152, предоставление пользователям права на удаление данных.

## 10. Метрики успеха
- Конверсия в регистрацию после примерки образа ≥ 25%.
- Среднее время до получения результата ≤ 8 секунд.
- Удержание визажистов (активность 1+ шаблонов в неделю) ≥ 60%.
- NPS пользователей ≥ 50.

## 11. Дальнейшие шаги
- Провести тестирование на выборке 20 клиентов и 5 визажистов.
- Настроить CI/CD для доставки обновлений (GitHub Actions → Streamlit Cloud / Vercel).
- Подготовить маркетинговые материалы и лендинг с описанием возможностей.
- Изучить возможности ARKit/ARCore для живого примеривания в мобильных версиях.
