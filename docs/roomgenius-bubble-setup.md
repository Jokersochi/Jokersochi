# RoomGenius: конфигурация Bubble

Подробная инструкция по созданию приложения RoomGenius в Bubble: структура данных, интеграции Replicate и YooKassa, предзаполнение стилей, основные воркфлоу, кастомный CSS/JS и чек‑лист тестирования перед запуском.

## 1. Структура базы данных
Создайте следующие типы данных в Bubble (добавляйте поля к встроенному `User`).

### User
- **text**
- **credits_remaining** (`number`)
- **credits_total_used** (`number`)
- **subscription_type** (`text`): `free`, `start`, `pro`, `business`
- **subscription_expiry** (`date`)
- **registration_date** (`date`)

### Project
- **text**
- **name** (`text`)
- **room_type** (`text`): `living_room`, `bedroom`, `kitchen`, `bathroom`
- **room_area** (`number`)
- **selected_style** (`Style`)
- **original_photo** (`image`)
- **created_by** (`User`)
- **created_date** (`date`)
- **status** (`text`): `pending`, `processing`, `completed`, `failed`

### Style
- **text**
- **name** (`text`)
- **name_en** (`text`)
- **prompt_base** (`text`)
- **negative_prompt** (`text`)
- **preview_image** (`image`)
- **is_active** (`yes/no`)
- **sort_order** (`number`)

### Generation
- **text**
- **project** (`Project`)
- **style_used** (`Style`)
- **result_image** (`image`)
- **result_url** (`text`)
- **prediction_id** (`text`)
- **generation_time** (`number`)
- **created_date** (`date`)
- **is_favorite** (`yes/no`)
- **seed_value** (`number`)

### Payment
- **text**
- **user** (`User`)
- **package_type** (`text`): `start`, `pro`, `business`
- **amount** (`number`)
- **credits_purchased** (`number`)
- **payment_id** (`text`)
- **status** (`text`): `pending`, `completed`, `failed`
- **created_date** (`date`)

## 2. API Connector: Replicate
1. Откройте **Plugins → API Connector** и создайте API **Replicate** с аутентификацией «Private key in header».
2. Заголовок авторизации: `Authorization: Token YOUR_REPLICATE_API_TOKEN_HERE`.

### Call: create_interior_design (POST, Action)
- URL: `https://api.replicate.com/v1/predictions`
- Headers: `Content-Type: application/json`
- JSON body:
  ```json
  {
    "version": "b10c1c8c4e4f4a9f8f9e9b9c8d8e8f8g",
    "input": {
      "image": "<image_url>",
      "prompt": "<prompt_text>",
      "negative_prompt": "<negative_prompt_text>",
      "num_inference_steps": 60,
      "guidance_scale": 7,
      "controlnet_conditioning_scale": 0.8,
      "seed": <seed_number>
    }
  }
  ```
- Параметры: `image_url` (text, required), `prompt_text` (text, required), `negative_prompt_text` (text, optional), `seed_number` (number, optional).
- Тестовая инициализация: image `https://replicate.delivery/pbxt/example.jpg`, prompt `modern minimalist interior, 8k, photorealistic`, negative `ugly, blurry, low quality`.

### Call: get_prediction_status (GET, Data)
- URL: `https://api.replicate.com/v1/predictions/<prediction_id>`
- Параметр: `prediction_id` (text, required)
- Инициализируйте с prediction_id из первого вызова.

## 3. Предзаполнение стилей
Создайте записи в `Style` (через backend workflow или вручную):

1. **Минимализм** — `name_en: minimalist`, `prompt_base: minimalist interior design, clean lines, neutral colors, functional furniture, natural light, professional photography, 8k, photorealistic, bright space, uncluttered`, `negative_prompt: clutter, ornate decorations, dark colors, busy patterns, vintage furniture, heavy curtains`, `sort_order: 1`, `is_active: yes`.
2. **Лофт** — `name_en: industrial loft`, `prompt_base: industrial loft interior, exposed brick walls, metal fixtures, concrete floor, vintage leather furniture, edison bulbs, high ceilings, urban style, 8k, photorealistic`, `negative_prompt: carpet, wallpaper, ornate decor, traditional furniture, low ceilings`, `sort_order: 2`, `is_active: yes`.
3. **Скандинавский** — `name_en: scandinavian`, `prompt_base: scandinavian interior design, light wood flooring, white walls, cozy textiles, indoor plants, minimalist furniture, hygge atmosphere, natural materials, 8k, photorealistic, soft lighting`, `negative_prompt: dark colors, heavy furniture, ornate decorations, cluttered space`, `sort_order: 3`, `is_active: yes`.
4. **Классика** — `name_en: classic`, `prompt_base: classic interior design, elegant furniture, moldings, chandeliers, rich fabrics, symmetrical layout, traditional style, luxury details, 8k, photorealistic`, `negative_prompt: modern minimalism, industrial, concrete, metal furniture`, `sort_order: 4`, `is_active: yes`.
5. **Хай‑тек** — `name_en: high-tech`, `prompt_base: high-tech interior design, sleek surfaces, chrome accents, LED lighting, smart home devices, glossy finishes, futuristic style, 8k, photorealistic, modern technology`, `negative_prompt: vintage, rustic, traditional, ornate, warm colors`, `sort_order: 5`, `is_active: yes`.

## 4. Workflows
### User Registration (Sign up)
1. **Make changes to Current User:** `credits_remaining = 3`, `credits_total_used = 0`, `subscription_type = "free"`, `registration_date = Current date/time`.
2. Показать алерт: «Добро пожаловать! У вас 3 бесплатные генерации 🎁».

### Generate Design (кнопка «Сгенерировать дизайн»)
Условие: `Current User's credits_remaining > 0`.

1. **Create Project:**
   - `name = "Проект " + Current date/time (DD.MM.YYYY HH:mm)`
   - `room_type = Dropdown_RoomType's value`
   - `room_area = Input_Area's value`
   - `selected_style = Dropdown_Style's value`
   - `original_photo = PictureUploader's value`
   - `created_by = Current User`
   - `status = processing`
2. Показать popup `Генерация_Loader`.
3. **Replicate → create_interior_design** с параметрами:
   - `image_url = Project's original_photo`
   - `prompt_text = selected_style's prompt_base + ", professional interior photography, 8k resolution, photorealistic render"`
   - `negative_prompt_text = selected_style's negative_prompt + ", ugly, deformed, blurry, low quality, watermark, text, distorted walls, unrealistic proportions"`
   - `seed_number = random(1, 999999)`
4. **Create Generation:** `project = Project`, `style_used = selected_style`, `prediction_id = step 3 id`, `seed_value = seed`, `created_date = Current date/time`.
5. **Update Current User:** `credits_remaining - 1`, `credits_total_used + 1`.
6. **Schedule API Workflow** `Check_Prediction_Status` через 5 секунд с `generation_id`.

### Backend: Check_Prediction_Status (recursive)
Параметр: `generation_id`.

1. Найти `Generation` по `unique id`.
2. **Replicate → get_prediction_status** (`prediction_id` из Generation).
3. Если статус **succeeded**:
   - Обновить Generation: `result_url = output:first item`, `result_image = output:first item (download as image)`, `generation_time = now - created_date (sec)`.
   - Обновить `Project.status = completed`.
   - (Опционально) отправить email пользователю.
4. Если статус **processing/starting**: повторно запланировать workflow через 3 секунды (макс. 30 попыток, добавьте счётчик).
5. Если статус **failed**:
   - Обновить `Project.status = failed`.
   - Вернуть кредит пользователю: `credits_remaining + 1`, `credits_total_used - 1`.

## 5. Кастомный JavaScript
### Optimize Image Before Upload (Run JavaScript action)
```javascript
function compressImage(file, maxWidth, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

(async function () {
  const fileInput = document.querySelector('[data-field-name="photo_upload"] input[type="file"]');
  if (fileInput && fileInput.files[0]) {
    const compressed = await compressImage(fileInput.files[0], 1920, 0.85);
    bubble.publish('image_compressed', { size: compressed.size });
  }
})();
```

### Real-time Credits Display
```javascript
function updateCreditsDisplay() {
  const creditsElement = document.querySelector('[data-credits-counter]');
  const userCredits = Number(creditsElement.getAttribute('data-credits'));
  let current = Number(creditsElement.textContent);
  const interval = setInterval(() => {
    if (current === userCredits) {
      clearInterval(interval);
    } else if (current < userCredits) {
      current++;
    } else {
      current--;
    }
    creditsElement.textContent = current;
  }, 50);
}

bubble.subscribe('credits_updated', updateCreditsDisplay);
```

## 6. YooKassa
1. Установите плагин **YooKassa | ЮКасса**.
2. В кабинете получите **Shop ID** и **Secret Key**; добавьте webhook `https://your-app.bubbleapps.io/api/1.1/wf/yookassa_webhook`.

### Покупка пакета
1. Создать `Payment`: `package_type = start`, `amount = 290`, `credits_purchased = 15`, `status = pending`, `created_date = now`.
2. **YooKassa → Create Payment**: `amount = 290`, `currency = RUB`, `description = "Пакет Старт - 15 генераций"`, `return_url = https://your-app.bubbleapps.io/success?payment_id=<Payment ID>`, `metadata = { payment_id, user_id }`.
3. Перейти по `confirmation_url`.

### Webhook `/api/1.1/wf/yookassa_webhook`
- Условие `payment.succeeded`.
- Найти `Payment` по `metadata.payment_id`.
- Обновить `status = completed` и увеличить пользователю `credits_remaining` на `credits_purchased`.
- (Опционально) отправить email.

## 7. UI: кастомный CSS
Добавьте в **Settings → SEO/Metatags → Script/meta tags in header**:
```xml
<style>
/* Gradient button для CTA */
.cta-generate-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    border-radius: 12px;
    padding: 16px 32px;
    font-size: 18px;
    font-weight: 600;
    color: white;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.cta-generate-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

.cta-generate-btn:active {
    transform: translateY(0);
}

/* Карточки стилей */
.style-card {
    border-radius: 16px;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.3s, box-shadow 0.3s;
    border: 3px solid transparent;
}

.style-card:hover {
    transform: scale(1.05);
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}

.style-card.selected {
    border-color: #667eea;
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.2);
}

/* Loader анимация */
.generation-loader {
    display: inline-block;
    width: 50px;
    height: 50px;
    border: 5px solid #f3f3f3;
    border-top: 5px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* Слайдер До/После */
.before-after-slider {
    position: relative;
    overflow: hidden;
    border-radius: 12px;
}

.before-after-slider .after-image {
    position: absolute;
    top: 0;
    left: 0;
    width: 50%;
    height: 100%;
    overflow: hidden;
    border-right: 3px solid white;
}

/* Credits badge */
.credits-badge {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

/* Responsive для мобильных */
@media (max-width: 768px) {
    .cta-generate-btn {
        width: 100%;
        font-size: 16px;
    }
    .style-card {
        margin-bottom: 12px;
    }
}
</style>
```

## 8. Промпт-инжиниринг
Backend function **Build Final Prompt**: параметры `base_prompt (text)`, `room_type (text)`, `additional_params (text, optional)`.

**Формула:**
```
base_prompt + ", " + room_type + " interior" +
", professional photography" +
", 8k resolution" +
", photorealistic render" +
", perfect lighting" +
", high detail" +
", architectural digest style" +
(additional_params is not empty ? ", " + additional_params : "")
```

Пример (Минимализм + спальня):
```
minimalist interior design, clean lines, neutral colors, functional furniture, natural light, professional photography, 8k, photorealistic, bright space, uncluttered, bedroom interior, professional photography, 8k resolution, photorealistic render, perfect lighting, high detail, architectural digest style
```

## 9. Settings и Privacy
- **Settings → General:** App name `RoomGenius`; подключите домен `roomgenius.ru`.
- **Settings → API:** включите Workflow API, отключите Data API.
- **Settings → SEO/metatags:**
  ```xml
  <meta property="og:title" content="RoomGenius - AI Дизайнер Интерьеров">
  <meta property="og:description" content="Создайте дизайн вашей комнаты за 30 секунд с помощью искусственного интеллекта">
  <meta property="og:image" content="https://your-cdn.com/og-image.jpg">
  
  <!-- Yandex.Metrika -->
  <script type="text/javascript">
     (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
     m[i].l=1*new Date();
     for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
     k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
     (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
  
     ym(ВАШИ ID, "init", {
          clickmap:true,
          trackLinks:true,
          accurateTrackBounce:true,
          webvisor:true,
          ecommerce:"dataLayer"
     });
  </script>
  ```

## 10. Тестирование и бэкап
Чек‑лист:
- Replicate API возвращает изображения (debug mode).
- Тестовый платёж YooKassa (карта 5555 5555 5555 4477) проходит.
- Кредиты корректно списываются.
- Пуллинг останавливается после 30 попыток.
- Email‑уведомления работают (если включены).
- Мобильная версия корректна на iPhone/Android.
- Privacy Rules: пользователь видит только свои `Projects` и `Generations`.

Бэкап: **Settings → General → Copy this application** для клонирования перед продакшеном.
