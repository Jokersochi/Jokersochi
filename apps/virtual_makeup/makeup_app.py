"""Streamlit прототип виртуального визажа с интеграцией Google Gemini."""
from __future__ import annotations

import base64
import io
import os
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional

import google.generativeai as genai
import streamlit as st
from PIL import Image


MODEL_NAME = "gemini-2.5-flash-image"
DEFAULT_INTENSITY = 0.8
REQUEST_TIMEOUT_SECONDS = 90


@dataclass(frozen=True)
class MakeupTemplate:
    """Описание шаблона макияжа."""

    key: str
    title: str
    prompt: str
    description: str
    default_intensity: float = DEFAULT_INTENSITY


TEMPLATES: List[MakeupTemplate] = [
    MakeupTemplate(
        key="natural_day",
        title="Натуральный дневной",
        description="Лёгкий макияж с акцентом на свежесть кожи и нюдовые оттенки.",
        prompt=(
            "Apply light foundation matching skin tone, sheer peach blush, nude satin lips, "
            "and softly defined brown mascara on this person's face. Maintain natural skin "
            "texture and realistic lighting."
        ),
        default_intensity=0.6,
    ),
    MakeupTemplate(
        key="smokey_evening",
        title="Smokey eyes вечерний",
        description="Драматичный взгляд с тёмными тенями и яркой помадой.",
        prompt=(
            "Add dramatic charcoal smoky eyeshadow with a diffused wing, matte red lips, sharp "
            "contouring, and a subtle glow highlight suited for evening light on this face."
        ),
        default_intensity=0.85,
    ),
    MakeupTemplate(
        key="peach_summer",
        title="Персиковый летний",
        description="Тёплый летний образ с сияющей кожей.",
        prompt=(
            "Create a sun-kissed summer look with peach blush, coral gloss lips, warm brown "
            "eyeshadow, and soft bronzer while preserving natural freckles and skin details."
        ),
        default_intensity=0.75,
    ),
    MakeupTemplate(
        key="golden_shimmer",
        title="Золотой шиммер",
        description="Праздничный образ с золотыми акцентами и подсвеченной кожей.",
        prompt=(
            "Apply golden shimmer eyeshadow, luminous bronzer, peachy nude lips, and "
            "defined lashes to create a festive glow on this person's face, keeping features "
            "realistic and flattering."
        ),
    ),
    MakeupTemplate(
        key="matte_minimal",
        title="Матовый минимализм",
        description="Минимальный макияж с матовой кожей и лёгкими акцентами.",
        prompt=(
            "Deliver a matte minimal makeup look with light coverage foundation, muted rose "
            "lips, softly filled brows, and delicate mascara for an understated professional "
            "finish on this person."
        ),
        default_intensity=0.5,
    ),
    MakeupTemplate(
        key="y2k_pop",
        title="Яркий Y2K",
        description="Ретро-образ начала 2000-х с яркими оттенками.",
        prompt=(
            "Transform this face with bold frosted blue eyeshadow, glossy pink lips, playful "
            "blush, and sparkly accents reminiscent of Y2K pop style while keeping the result "
            "photorealistic."
        ),
        default_intensity=0.9,
    ),
    MakeupTemplate(
        key="emerald_drama",
        title="Зелёная драма",
        description="Глубокие изумрудные тени и графичные стрелки.",
        prompt=(
            "Design an emerald drama look: emerald metallic eyeshadow, precise black liner, nude "
            "matte lips, and sculpted cheekbones with cinematic lighting on this person's face."
        ),
        default_intensity=0.88,
    ),
    MakeupTemplate(
        key="glitter_party",
        title="Глиттер party",
        description="Смелый клубный образ со стразами и блёстками.",
        prompt=(
            "Style this person for a party with silver glitter cut-crease eyes, layered mascara, "
            "lavender gloss lips, and pronounced contour while keeping proportions realistic."
        ),
    ),
]


def _get_template_map(templates: Iterable[MakeupTemplate]) -> Dict[str, MakeupTemplate]:
    return {template.title: template for template in templates}


def get_api_key() -> Optional[str]:
    """Пытаемся получить ключ API из secrets или переменных окружения."""

    secret_key = st.secrets.get("GOOGLE_API_KEY") if hasattr(st, "secrets") else None
    env_key = os.getenv("GOOGLE_API_KEY")
    return secret_key or env_key


@st.cache_resource(show_spinner=False)
def get_model(api_key: str) -> genai.GenerativeModel:
    """Создаёт и кэширует клиент Gemini для обработки изображений."""

    genai.configure(api_key=api_key)
    return genai.GenerativeModel(MODEL_NAME)


def compose_prompt(template: MakeupTemplate, intensity: float, extras: str) -> str:
    """Формирует инструкцию для модели с учётом шаблона и пожеланий пользователя."""

    base = (
        "You are an elite makeup artist creating photorealistic virtual try-on results. "
        "Respect the client's identity, proportions, and lighting. "
        "Apply the following makeup style at intensity {intensity:.2f} (0=minimal, 1=bold): {prompt}."
    ).format(intensity=intensity, prompt=template.prompt)

    if extras.strip():
        base += " Additional creative notes from the client: " + extras.strip()
    base += " Ensure the output looks like a high-quality beauty photography retouch."
    return base


def encode_image(image: Image.Image) -> bytes:
    """Конвертирует изображение в PNG-байты."""

    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def extract_image_bytes(response: genai.types.GenerateContentResponse) -> bytes:
    """Извлекает результат работы модели из ответа API."""

    parts = []
    if hasattr(response, "candidates"):
        for candidate in response.candidates or []:
            if candidate.content and getattr(candidate.content, "parts", None):
                parts.extend(candidate.content.parts)
    if hasattr(response, "parts"):
        parts.extend(response.parts or [])

    for part in parts:
        inline_data = getattr(part, "inline_data", None)
        if not inline_data or not getattr(inline_data, "data", None):
            continue
        data = inline_data.data
        if isinstance(data, bytes):
            return data
        return base64.b64decode(data)
    raise ValueError("Модель не вернула изображение. Проверьте ограничения и настройки промпта.")


def generate_makeup(
    model: genai.GenerativeModel,
    template: MakeupTemplate,
    intensity: float,
    extras: str,
    image_bytes: bytes,
) -> bytes:
    """Отправляет запрос к Gemini и возвращает байты обработанного изображения."""

    prompt = compose_prompt(template, intensity, extras)
    response = model.generate_content(
        [
            prompt,
            {"mime_type": "image/png", "data": image_bytes},
        ],
        request_options={"timeout": REQUEST_TIMEOUT_SECONDS},
    )
    return extract_image_bytes(response)


def main() -> None:
    st.set_page_config(page_title="Виртуальный макияж", page_icon="💄", layout="wide")
    st.title("💄 Виртуальный макияж с Nano Banana")
    st.write(
        "Загрузите портрет, выберите стиль макияжа и настройте интенсивность — Nano Banana "
        "создаст реалистичный образ за несколько секунд."
    )

    template_map = _get_template_map(TEMPLATES)
    template_titles = list(template_map.keys())

    api_key = get_api_key()
    if not api_key:
        st.warning(
            "Укажите ключ API Google Gemini в переменной окружения `GOOGLE_API_KEY` или в файле"
            " `secrets.toml` Streamlit. Запросы к модели будут недоступны без ключа."
        )

    uploaded_file = st.file_uploader(
        "Фото лица (JPG/PNG, хорошо освещённый фронтальный портрет)",
        type=["jpg", "jpeg", "png"],
        accept_multiple_files=False,
    )

    if not uploaded_file:
        st.info("Загрузите фотографию, чтобы продолжить.")
        return

    original_image = Image.open(uploaded_file).convert("RGB")

    col_left, col_right = st.columns([2, 1])
    with col_left:
        st.subheader("Исходное изображение")
        st.image(original_image, use_column_width=True)
    with col_right:
        st.subheader("Настройки макияжа")
        template_title = st.selectbox("Стиль", template_titles)
        template = template_map[template_title]
        intensity = st.slider(
            "Интенсивность",
            min_value=0.2,
            max_value=1.0,
            value=float(template.default_intensity),
            step=0.05,
            help="0.2 — почти незаметный макияж, 1.0 — максимальная насыщенность",
        )
        extras = st.text_area(
            "Дополнительные пожелания",
            placeholder="Например: добавить акцент на веснушки, использовать холодные оттенки...",
        )

    if not api_key:
        st.stop()

    try:
        model = get_model(api_key)
    except Exception as error:  # pragma: no cover - визуальное уведомление
        st.error(
            "Не удалось инициализировать клиента Gemini. Убедитесь, что ключ верный и у аккаунта"
            " есть доступ к модели Nano Banana. Подробнее в логах Streamlit."
        )
        st.exception(error)
        return

    if st.button("Примерить макияж ✨", type="primary"):
        with st.spinner("Nano Banana подбирает макияж..."):
            try:
                generated_bytes = generate_makeup(model, template, intensity, extras, encode_image(original_image))
            except Exception as error:  # pragma: no cover - визуальное уведомление
                st.error(
                    "Не удалось получить результат от модели. Проверьте лимиты, промпт и формат фото."
                )
                st.exception(error)
                return

        result_image = Image.open(io.BytesIO(generated_bytes))

        st.success("Готово! Ниже можно сравнить исходник и результат.")
        before, after = st.columns(2)
        with before:
            st.caption("До")
            st.image(original_image, use_column_width=True)
        with after:
            st.caption("После")
            st.image(result_image, use_column_width=True)

        st.download_button(
            label="Скачать результат в PNG",
            data=generated_bytes,
            file_name="virtual_makeup_result.png",
            mime="image/png",
        )

        st.markdown(
            "💡 *Совет*: попробуйте загрузить другое фото или уменьшить интенсивность для более "
            "натурального образа."
        )


if __name__ == "__main__":
    main()
