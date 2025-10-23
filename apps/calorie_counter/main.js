const fileInput = document.getElementById('photo-input');
const previewImage = document.querySelector('[data-role="preview"]');
const placeholder = document.querySelector('[data-role="placeholder"]');
const progressOverlay = document.querySelector('[data-role="progress"]');
const progressText = document.querySelector('[data-role="progress-text"]');
const resultCard = document.querySelector('[data-role="result-card"]');
const resultMessage = document.querySelector('[data-role="result-message"]');
const predictionTable = document.querySelector('[data-role="prediction-table"]');
const predictionBody = document.querySelector('[data-role="prediction-body"]');
const portionWrapper = document.querySelector('[data-role="portion"]');
const portionSlider = document.getElementById('portion-slider');
const portionValue = document.querySelector('[data-role="portion-value"]');

let mobilenetModelPromise;
let currentPredictions = [];
let currentPortion = Number(portionSlider?.value ?? 150);

const calorieDatabase = [
  { key: 'pizza', label: 'Пицца', caloriesPer100g: 266, synonyms: ['pizza'] },
  { key: 'burger', label: 'Бургер', caloriesPer100g: 295, synonyms: ['cheeseburger', 'hamburger'] },
  { key: 'hotdog', label: 'Хот-дог', caloriesPer100g: 290, synonyms: ['hotdog'] },
  { key: 'sandwich', label: 'Сэндвич', caloriesPer100g: 240, synonyms: ['sandwich', 'club sandwich'] },
  { key: 'fries', label: 'Картофель фри', caloriesPer100g: 312, synonyms: ['french fries'] },
  { key: 'salad', label: 'Салат', caloriesPer100g: 120, synonyms: ['caesar salad', 'green salad'] },
  { key: 'sushi', label: 'Суши', caloriesPer100g: 150, synonyms: ['sushi', 'sashimi', 'nigiri'] },
  { key: 'ramen', label: 'Рамен', caloriesPer100g: 132, synonyms: ['ramen'] },
  { key: 'noodles', label: 'Лапша', caloriesPer100g: 138, synonyms: ['spaghetti squash', 'spaghetti', 'noodle', 'lo mein', 'pasta'] },
  { key: 'pasta', label: 'Паста', caloriesPer100g: 160, synonyms: ['carbonara', 'macaroni', 'pasta'] },
  { key: 'steak', label: 'Стейк', caloriesPer100g: 271, synonyms: ['sirloin', 'steak'] },
  { key: 'chicken', label: 'Жареная курица', caloriesPer100g: 239, synonyms: ['fried chicken'] },
  { key: 'taco', label: 'Тако', caloriesPer100g: 226, synonyms: ['taco'] },
  { key: 'burrito', label: 'Буррито', caloriesPer100g: 206, synonyms: ['burrito'] },
  { key: 'soup', label: 'Суп', caloriesPer100g: 80, synonyms: ['soup'] },
  { key: 'omelette', label: 'Омлет', caloriesPer100g: 154, synonyms: ['omelet', 'omelette'] },
  { key: 'pancake', label: 'Блины', caloriesPer100g: 227, synonyms: ['pancake'] },
  { key: 'waffle', label: 'Вафли', caloriesPer100g: 291, synonyms: ['waffle'] },
  { key: 'croissant', label: 'Круассан', caloriesPer100g: 406, synonyms: ['croissant'] },
  { key: 'donut', label: 'Пончик', caloriesPer100g: 452, synonyms: ['doughnut', 'donut'] },
  { key: 'cake', label: 'Торт', caloriesPer100g: 340, synonyms: ['cake'] },
  { key: 'muffin', label: 'Маффин', caloriesPer100g: 333, synonyms: ['muffin'] },
  { key: 'icecream', label: 'Мороженое', caloriesPer100g: 207, synonyms: ['ice cream'] },
  { key: 'yogurt', label: 'Йогурт', caloriesPer100g: 95, synonyms: ['yogurt'] },
  { key: 'coffee', label: 'Кофе', caloriesPer100g: 25, synonyms: ['espresso', 'coffee'] },
  { key: 'latte', label: 'Латте', caloriesPer100g: 54, synonyms: ['latte', 'cappuccino'] },
  { key: 'tea', label: 'Чай', caloriesPer100g: 1, synonyms: ['tea'] },
  { key: 'apple', label: 'Яблоко', caloriesPer100g: 52, synonyms: ['apple'] },
  { key: 'banana', label: 'Банан', caloriesPer100g: 89, synonyms: ['banana'] },
  { key: 'orange', label: 'Апельсин', caloriesPer100g: 43, synonyms: ['orange'] },
  { key: 'grapes', label: 'Виноград', caloriesPer100g: 69, synonyms: ['grape'] },
  { key: 'strawberry', label: 'Клубника', caloriesPer100g: 33, synonyms: ['strawberry'] },
  { key: 'broccoli', label: 'Брокколи', caloriesPer100g: 34, synonyms: ['broccoli'] },
  { key: 'carrot', label: 'Морковь', caloriesPer100g: 41, synonyms: ['carrot'] },
  { key: 'avocado', label: 'Авокадо', caloriesPer100g: 160, synonyms: ['avocado'] },
  { key: 'cheese', label: 'Сыр', caloriesPer100g: 403, synonyms: ['cheeseburger', 'cheese'] },
  { key: 'salmon', label: 'Лосось', caloriesPer100g: 208, synonyms: ['salmon'] },
  { key: 'tuna', label: 'Тунец', caloriesPer100g: 144, synonyms: ['tuna'] },
  { key: 'shrimp', label: 'Креветки', caloriesPer100g: 99, synonyms: ['shrimp'] }
];

async function loadModel() {
  if (!mobilenetModelPromise) {
    mobilenetModelPromise = new Promise((resolve, reject) => {
      if (!window.mobilenet) {
        reject(new Error('Скрипт модели не загружен. Проверьте подключение к интернету.'));
        return;
      }

      window.mobilenet
        .load({ version: 2, alpha: 1.0 })
        .then(resolve)
        .catch((error) => {
          mobilenetModelPromise = undefined;
          reject(error);
        });
    });
  }

  return mobilenetModelPromise;
}

function setLoadingState(isLoading, message = 'Обработка изображения…') {
  if (!progressOverlay || !progressText) return;
  if (isLoading) {
    progressText.textContent = message;
    progressOverlay.hidden = false;
  } else {
    progressOverlay.hidden = true;
  }
}

function updatePortionValue(grams) {
  currentPortion = grams;
  if (portionValue) {
    portionValue.textContent = `${grams} г`;
  }
  if (currentPredictions.length > 0) {
    renderPredictions(currentPredictions);
  }
}

function normalizeLabel(label) {
  return label
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .trim();
}

function findFoodByPrediction(predictionLabel) {
  const normalized = normalizeLabel(predictionLabel);
  return calorieDatabase.find(({ synonyms }) =>
    synonyms.some((synonym) => normalized.includes(synonym))
  );
}

function renderPredictions(predictions) {
  if (!predictionTable || !predictionBody) {
    return;
  }

  predictionBody.innerHTML = '';

  predictions.forEach((item) => {
    const calories = Math.round((item.food.caloriesPer100g * currentPortion) / 100);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${item.food.label}</strong><div class="caption">${item.label}</div></td>
      <td>${Math.round(item.probability * 100)}%</td>
      <td>${calories} ккал</td>
    `;
    predictionBody.appendChild(row);
  });

  predictionTable.hidden = predictions.length === 0;
}

function showResult({ type, message }) {
  if (!resultCard || !resultMessage) return;

  resultCard.classList.remove('result-card--success', 'result-card--error', 'result-card--empty');

  switch (type) {
    case 'success':
      resultCard.classList.add('result-card--success');
      break;
    case 'error':
      resultCard.classList.add('result-card--error');
      break;
    default:
      resultCard.classList.add('result-card--empty');
  }

  resultMessage.textContent = message;
}

async function runRecognition(imageElement) {
  try {
    setLoadingState(true);
    const model = await loadModel();
    setLoadingState(true, 'Распознаём блюдо…');
    const predictions = await model.classify(imageElement, 5);

    const mappedPredictions = predictions
      .map((prediction) => {
        const food = findFoodByPrediction(prediction.className);
        return food
          ? {
              label: prediction.className,
              probability: prediction.probability,
              food
            }
          : null;
      })
      .filter(Boolean)
      .slice(0, 5);

    currentPredictions = mappedPredictions;

    if (mappedPredictions.length === 0) {
      if (predictionTable) {
        predictionTable.hidden = true;
      }
      if (portionWrapper) {
        portionWrapper.hidden = true;
      }
      showResult({
        type: 'error',
        message: 'Не удалось сопоставить блюдо с базой калорийности. Попробуйте другое фото или выберите понятный ракурс.'
      });
      return;
    }

    if (portionWrapper) {
      portionWrapper.hidden = false;
    }
    renderPredictions(mappedPredictions);
    showResult({
      type: 'success',
      message: 'Выберите подходящий вариант и при необходимости скорректируйте массу порции.'
    });
  } catch (error) {
    console.error(error);
    showResult({
      type: 'error',
      message: 'Произошла ошибка при распознавании. Проверьте подключение к интернету и попробуйте снова.'
    });
  } finally {
    setLoadingState(false);
  }
}

function resetState() {
  currentPredictions = [];
  if (predictionBody) {
    predictionBody.innerHTML = '';
  }
  if (predictionTable) {
    predictionTable.hidden = true;
  }
  if (portionWrapper) {
    portionWrapper.hidden = true;
  }
  if (previewImage) {
    previewImage.hidden = true;
    previewImage.removeAttribute('src');
  }
  if (placeholder) {
    placeholder.hidden = false;
  }
  if (resultCard) {
    resultCard.classList.remove('result-card--success', 'result-card--error');
    resultCard.classList.add('result-card--empty');
  }
  if (resultMessage) {
    resultMessage.textContent = 'После распознавания здесь появится список возможных блюд и оценка калорийности.';
  }
}

function handleFileSelection(event) {
  const [file] = event.target.files || [];
  if (!file) {
    return;
  }

  resetState();

  if (!file.type.startsWith('image/')) {
    showResult({ type: 'error', message: 'Поддерживаются только файлы изображений.' });
    return;
  }

  const reader = new FileReader();
  setLoadingState(true, 'Загружаем изображение…');

  reader.onload = () => {
    if (previewImage) {
      previewImage.src = reader.result;
      previewImage.hidden = false;
      previewImage.onload = () => {
        setLoadingState(false);
        if (placeholder) {
          placeholder.hidden = true;
        }
        runRecognition(previewImage);
      };
      previewImage.onerror = () => {
        setLoadingState(false);
        showResult({ type: 'error', message: 'Не удалось загрузить изображение. Попробуйте другое фото.' });
      };
    }
  };

  reader.onerror = () => {
    setLoadingState(false);
    showResult({ type: 'error', message: 'Не удалось прочитать файл. Попробуйте снова.' });
  };

  reader.readAsDataURL(file);
}

if (fileInput) {
  fileInput.addEventListener('change', handleFileSelection);
}

if (portionSlider) {
  portionSlider.addEventListener('input', (event) => {
    const value = Number(event.target.value);
    updatePortionValue(value);
  });
}

resetState();
updatePortionValue(currentPortion);

// Предзагружаем модель после небольшой задержки, чтобы не блокировать интерфейс
window.addEventListener('load', () => {
  setTimeout(() => {
    loadModel().catch((error) => {
      console.error(error);
      showResult({
        type: 'error',
        message: 'Не удалось загрузить модель распознавания. Попробуйте обновить страницу.'
      });
    });
  }, 500);
});
