const fs = require('fs');
const path = require('path');

const promptPath = path.join(__dirname, '..', 'files', 'architectural-visuals.json');
const data = JSON.parse(fs.readFileSync(promptPath, 'utf-8'));

const outputLines = [];
const promptSuffix = data.globalConstraints.promptSuffix
  ? data.globalConstraints.promptSuffix.trim()
  : '';

outputLines.push('АРХИТЕКТУРНЫЙ НАБОР ПРОМПТОВ');
outputLines.push('='.repeat(34));
outputLines.push('');
outputLines.push('Проектные ограничения:');
outputLines.push(`- Тип здания: ${data.project.buildingType}`);
outputLines.push(`- Габарит: ${data.project.footprintMeters} м`);
outputLines.push(`- Сетка X: ${data.project.grid.xDirection}`);
outputLines.push(`- Сетка Y: ${data.project.grid.yDirection}`);
outputLines.push(`- Колонны: ${data.project.columns}`);
outputLines.push(`- Стены: наружные ${data.project.walls.external}, внутренняя ${data.project.walls.internal}`);
outputLines.push(`- Отметки этажей: ${data.project.floorLevelsMeters}`);
outputLines.push(`- Высота этажа: ${data.project.clearHeightMeters}`);
outputLines.push(`- Лестница: ${data.project.staircase}`);
outputLines.push(`- Крыша: ${data.project.roof}`);
outputLines.push('');
outputLines.push('Стилистика:');
outputLines.push(`- Экстерьер: ${data.globalConstraints.style.exterior}`);
outputLines.push(`- Интерьер: ${data.globalConstraints.style.interior}`);
outputLines.push(`- Материалы фасада: ${data.globalConstraints.style.materials.join(', ')}`);
outputLines.push(`- Палитра: ${data.globalConstraints.style.palette.join(', ')}`);
outputLines.push('');
outputLines.push('Настройки рендера:');
outputLines.push(`- Качество: ${data.globalConstraints.renderSettings.quality}`);
outputLines.push(`- Освещение: ${data.globalConstraints.renderSettings.lighting}`);
outputLines.push(`- Камера: ${data.globalConstraints.renderSettings.camera}`);
outputLines.push(`- Тени: ${data.globalConstraints.renderSettings.shadows}`);
outputLines.push('');
outputLines.push('Обязательные условия:');
for (const item of data.globalConstraints.must) {
  outputLines.push(`- ${item}`);
}
outputLines.push('');
outputLines.push('Запрещено:');
for (const item of data.globalConstraints.forbidden) {
  outputLines.push(`- ${item}`);
}
outputLines.push('');
outputLines.push('Общая приписка к промптам:');
outputLines.push(`- ${data.globalConstraints.promptSuffix}`);
outputLines.push('');
outputLines.push('Список выдачи:');
for (const item of data.deliverables) {
  outputLines.push(`- ${item}`);
}
outputLines.push('');

const appendPromptSuffix = (basePrompt) => {
  const trimmedPrompt = basePrompt.trim();
  if (!promptSuffix) {
    return trimmedPrompt;
  }
  if (trimmedPrompt.endsWith(promptSuffix)) {
    return trimmedPrompt;
  }
  return `${trimmedPrompt} ${promptSuffix}`;
};

const pushPromptBlock = (sectionTitle, { title, prompt, negative }) => {
  outputLines.push(`${sectionTitle}: ${title}`);
  outputLines.push('PROMPT:');
  outputLines.push(appendPromptSuffix(prompt));
  outputLines.push('NEGATIVE:');
  outputLines.push(negative);
  outputLines.push('');
};

pushPromptBlock('Экстерьер', data.prompts.exterior);

data.prompts.interiors.forEach((item) => pushPromptBlock('Интерьер', item));

data.prompts.views3d.forEach((item) => pushPromptBlock('3D вид', item));

data.prompts.floorPlans.forEach((item) => pushPromptBlock('План', item));

process.stdout.write(outputLines.join('\n'));
