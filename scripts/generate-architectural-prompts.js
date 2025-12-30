const fs = require('fs');
const path = require('path');

const promptPath = path.join(__dirname, '..', 'files', 'architectural-visuals.json');
const data = JSON.parse(fs.readFileSync(promptPath, 'utf-8'));

const outputLines = [];

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
outputLines.push('Список выдачи:');
for (const item of data.deliverables) {
  outputLines.push(`- ${item}`);
}
outputLines.push('');

const pushPromptBlock = (sectionTitle, { title, prompt, negative }) => {
  outputLines.push(`${sectionTitle}: ${title}`);
  outputLines.push('PROMPT:');
  outputLines.push(prompt);
  outputLines.push('NEGATIVE:');
  outputLines.push(negative);
  outputLines.push('');
};

pushPromptBlock('Экстерьер', data.prompts.exterior);

data.prompts.interiors.forEach((item) => pushPromptBlock('Интерьер', item));

data.prompts.views3d.forEach((item) => pushPromptBlock('3D вид', item));

data.prompts.floorPlans.forEach((item) => pushPromptBlock('План', item));

process.stdout.write(outputLines.join('\n'));
