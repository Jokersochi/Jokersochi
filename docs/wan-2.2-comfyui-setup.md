# Установка WAN 2.2 для Image-to-Video и Text-to-Video в ComfyUI

Это руководство поможет развернуть локальную среду для генерации видео при помощи моделей **WAN 2.2** в интерфейсе **ComfyUI**. В инструкции описаны требования, установка зависимостей, загрузка весов модели и настройка рабочих процессов для режимов *image-to-video* и *text-to-video*.

## 0. Быстрый старт через скрипт

Для автоматической установки используйте скрипт [`scripts/setup-wan22-comfyui.sh`](../scripts/setup-wan22-comfyui.sh):

```bash
chmod +x scripts/setup-wan22-comfyui.sh
./scripts/setup-wan22-comfyui.sh --dir ~/ComfyUI --venv ~/.venvs/comfyui --token <HF_TOKEN>
```

Параметры:

- `--dir` — директория для установки ComfyUI (по умолчанию `./ComfyUI`).
- `--venv` — путь к виртуальному окружению Python (по умолчанию `<dir>/.venv`).
- `--token` — токен Hugging Face для автоматической загрузки весов (опционально, но требуется при приватных моделях).
- `--skip-models` — пропустить скачивание весов WAN 2.2.
- `--text-model`, `--text-file`, `--image-model`, `--image-file` — переопределение репозиториев и имён файлов.

После выполнения скрипта активируйте окружение и запустите ComfyUI:

```bash
source ~/.venvs/comfyui/bin/activate
python ~/ComfyUI/main.py --listen 0.0.0.0 --port 8188
```

### Пошаговая установка и запуск через скрипт

1. **Склонируйте этот репозиторий или скачайте только скрипт.**
   ```bash
   git clone https://github.com/<ваш-аккаунт>/Jokersochi.git
   cd Jokersochi
   ```
   > Если нужен только установщик — скачайте файл `scripts/setup-wan22-comfyui.sh` через кнопку *Download raw* на GitHub и сохраните его в удобное место.
2. **Сделайте скрипт исполняемым и запустите его.** Укажите директорию под установку (пример — `~/ComfyUI`) и, при необходимости, токен Hugging Face:
   ```bash
   chmod +x scripts/setup-wan22-comfyui.sh
   ./scripts/setup-wan22-comfyui.sh --dir ~/ComfyUI --venv ~/.venvs/comfyui --token hf_xxx
   ```
   Без флага `--token` загрузка приватных весов WAN 2.2 будет пропущена.
3. **Дождитесь завершения установки.** Скрипт создаст виртуальное окружение, поставит зависимости, скачает узлы WAN и модели.
4. **Активируйте окружение и запустите ComfyUI.**
   ```bash
   source ~/.venvs/comfyui/bin/activate
   python ~/ComfyUI/main.py --listen 0.0.0.0 --port 8188
   ```
   > На Windows используйте PowerShell и команду `~\.venvs\comfyui\Scripts\Activate.ps1`, затем `python .\main.py --listen 0.0.0.0 --port 8188` из каталога установки.
5. **Откройте интерфейс в браузере** по адресу `http://localhost:8188/`, загрузите рабочие процессы WAN 2.2 и начните генерацию.

Остальные шаги можно выполнить вручную по инструкции ниже.

## 1. Минимальные требования

| Компонент | Рекомендация |
| --- | --- |
| GPU | NVIDIA RTX 3060 (12 ГБ) или лучше. Для моделей XL желательно ≥ 24 ГБ видеопамяти. |
| Драйверы | NVIDIA 535+ с поддержкой CUDA 12. |
| Операционная система | Windows 11 / WSL2, Ubuntu 22.04 или другая современная Linux. |
| Python | 3.10–3.11 (64-bit). |
| Свободное место | 20–40 ГБ на SSD для моделей и временных файлов. |

## 2. Подготовка окружения

1. **Обновите драйверы и CUDA**
   - Windows: установите последнюю версию NVIDIA Game Ready или Studio Driver.
   - Linux: обновите драйвер через пакетный менеджер и убедитесь, что `nvidia-smi` корректно отображает GPU.
2. **Установите Git и Python**
   - Windows: [Git for Windows](https://git-scm.com/download/win) и [Python 3.11](https://www.python.org/downloads/windows/).
   - Linux: `sudo apt update && sudo apt install git python3 python3-venv python3-pip`.
3. **Настройте виртуальное окружение (рекомендуется)**
   ```bash
   python3 -m venv ~/.venvs/comfyui
   source ~/.venvs/comfyui/bin/activate  # Windows: .\.venvs\comfyui\Scripts\activate
   ```

## 3. Установка ComfyUI

```bash
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI
pip install --upgrade pip
pip install -r requirements.txt
```

Дополнительно установите зависимости для работы с видео:

```bash
pip install av imageio-ffmpeg moviepy
```

Создайте структуру каталогов (ComfyUI создаёт их автоматически при первом запуске, но удобно подготовить заранее):

```bash
mkdir -p models/checkpoints models/unet models/vae models/clip models/wan
mkdir -p custom_nodes
```

## 4. Установка узлов WAN для ComfyUI

1. Перейдите в каталог `custom_nodes` и клонируйте проект с узлами для WAN:
   ```bash
   cd custom_nodes
   git clone https://github.com/Wan-Community/ComfyUI-Wan-Nodes.git
   cd ..
   ```
   Репозиторий содержит лоадеры и готовые графы для WAN 2.x.
2. Проверьте файл `requirements.txt` внутри `ComfyUI-Wan-Nodes` и установите дополнительные зависимости, если они указаны:
   ```bash
   pip install -r custom_nodes/ComfyUI-Wan-Nodes/requirements.txt
   ```

## 5. Загрузка весов WAN 2.2

1. **Зарегистрируйтесь на Hugging Face** и примите лицензионное соглашение модели WAN 2.2 (https://huggingface.co/Wan-Community).
2. Установите CLI Hugging Face (опционально, но удобно для обновлений):
   ```bash
   pip install huggingface_hub
   huggingface-cli login
   ```
3. Скачайте веса для обоих режимов (пример с помощью `huggingface-cli`):
   ```bash
   huggingface-cli download Wan-Community/WAN2.2-Text2Video wan2.2_text2video_fp16.safetensors --local-dir models/wan
   huggingface-cli download Wan-Community/WAN2.2-Image2Video wan2.2_image2video_fp16.safetensors --local-dir models/wan
   ```
   При необходимости скачайте уменьшенные или XL-версии весов. Файлы можно загрузить и через браузер, затем переместить в `ComfyUI/models/wan`.
4. Добавьте вспомогательные модели (VAE, CLIP, Motion modules), если они указаны на странице репозитория. Разместите их в соответствующих подпапках `models/` согласно инструкции из `README` узлов.

## 6. Первый запуск ComfyUI

Запустите сервер из корня проекта:

```bash
python main.py --listen 0.0.0.0 --port 8188
```

Перейдите в браузере на `http://localhost:8188/` и убедитесь, что интерфейс загружается без ошибок. При первом запуске ComfyUI создаст кэш и проиндексирует скачанные модели.

## 7. Настройка рабочих процессов

### 7.1 Text-to-Video

1. В интерфейсе ComfyUI откройте меню **Load** → **Load workflow** и выберите один из файлов из `custom_nodes/ComfyUI-Wan-Nodes/workflows`, например `wan2.2_text2video_basic.json`.
2. Проверьте ноды:
   - `WAN2.2 Loader` — укажите путь к `wan2.2_text2video_fp16.safetensors`.
   - `Text Encoder` — выберите нужный CLIP-токенайзер.
   - `Scheduler / Sampler` — начните с `Euler` или `UniPC` (по умолчанию в примере).
3. Настройте параметры генерации: количество кадров (обычно 16–32), шаги (20–30), разрешение (до 1024×576 на 12 ГБ GPU).
4. Введите текстовый промпт, при необходимости задайте отрицательный промпт.
5. Нажмите **Queue Prompt**. Результат сохранится в `ComfyUI/output/video` в формате MP4/WEBM.

### 7.2 Image-to-Video

1. Загрузите стартовое изображение в узел `Load Image`.
2. Подключите его к узлу `WAN2.2 Image-to-Video Loader`.
3. Настройте параметры движения: длительность (кадры), интенсивность деформации, seed.
4. При необходимости используйте контроллеры движения (Camera Path / Optical Flow), доступные в наборе узлов.
5. Запустите очередь. Видео сохранится в `output/video`.

## 8. Оптимизация и обслуживание

- **FP16 vs. BF16:** Для видеокарт с поддержкой BF16 можно использовать соответствующие веса, это ускорит генерацию.
- **xFormers / Torch 2.1:** Установите `pip install xformers==0.0.22.post7` для ускорения на RTX 40xx.
- **Обновления:** периодически обновляйте ветку `main` репозитория ComfyUI и `ComfyUI-Wan-Nodes`:
  ```bash
  git pull
  git -C custom_nodes/ComfyUI-Wan-Nodes pull
  ```
- **Очистка кэша:** удаляйте содержимое `ComfyUI/temp` и `ComfyUI/output` при нехватке места.
- **Мониторинг VRAM:** используйте `nvidia-smi -l 2` для контроля загрузки памяти и подбор параметров.

## 9. Частые проблемы

| Симптом | Возможная причина | Решение |
| --- | --- | --- |
| `RuntimeError: CUDA out of memory` | Недостаточно видеопамяти | Уменьшите разрешение, количество кадров или используйте fp16 веса. |
| Видео тёмное/пересвеченное | Неподходящий VAE | Проверьте, что установлен рекомендованный VAE для WAN 2.2. |
| Ноды не отображаются в ComfyUI | Узлы не загружены | Проверьте `custom_nodes/ComfyUI-Wan-Nodes` и перезапустите ComfyUI, убедитесь в установке зависимостей. |
| Ошибка авторизации Hugging Face | Не принят license agreement | Примите лицензию модели в профиле HF и обновите токен. |

## 10. Дополнительные ресурсы

- Официальный репозиторий ComfyUI: https://github.com/comfyanonymous/ComfyUI
- Узлы WAN для ComfyUI: https://github.com/Wan-Community/ComfyUI-Wan-Nodes
- Модели WAN 2.2 на Hugging Face: https://huggingface.co/Wan-Community
- Сообщество ComfyUI (Discord): https://discord.gg/comfyui

Следуя этим шагам, вы сможете локально развернуть WAN 2.2 для генерации видео из текста и изображений в ComfyUI и поддерживать окружение в актуальном состоянии.
