const fs = require('fs');
const path = require('path');

const promptPath = path.join(__dirname, '..', 'files', 'architectural-visuals.json');
const data = JSON.parse(fs.readFileSync(promptPath, 'utf-8'));

const args = process.argv.slice(2);
const outputLines = [];
const usageText = [
  'Usage:',
  '  node scripts/generate-architectural-prompts.js [--format plain|markdown|json] [--out <path>] [--no-suffix]',
  '',
  'Options:',
  '  --format <plain|markdown|json>  Output format (default: plain).',
  '  --out <path>               Write output to file instead of stdout.',
  '  --no-suffix                Do not append the shared prompt suffix.',
  '  --help                     Show this help message.'
].join('\n');

const parseArgs = (rawArgs) => {
  let formatValue = 'plain';
  let outputValue = null;
  let disableSuffix = false;

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];

    if (arg === '--help') {
      return { help: true };
    }

    if (arg === '--format') {
      const nextArg = rawArgs[index + 1];
      if (!nextArg || nextArg.startsWith('--')) {
        throw new Error('Не указан формат для --format');
      }
      formatValue = nextArg;
      index += 1;
      continue;
    }

    if (arg.startsWith('--format=')) {
      formatValue = arg.split('=').slice(1).join('=');
      if (!formatValue) {
        throw new Error('Не указан формат для --format');
      }
      continue;
    }

    if (arg === '--out') {
      const nextArg = rawArgs[index + 1];
      if (!nextArg || nextArg.startsWith('--')) {
        throw new Error('Не указан путь для --out');
      }
      outputValue = nextArg;
      index += 1;
      continue;
    }

    if (arg.startsWith('--out=')) {
      outputValue = arg.split('=').slice(1).join('=');
      if (!outputValue) {
        throw new Error('Не указан путь для --out');
      }
      continue;
    }

    if (arg === '--no-suffix') {
      disableSuffix = true;
      continue;
    }

    throw new Error(`Неизвестный аргумент: ${arg}`);
  }

  return { format: formatValue, outputPath: outputValue, disableSuffix };
};

let parsedArgs = {};

try {
  parsedArgs = parseArgs(args);
} catch (error) {
  process.stderr.write(`${error.message}\n${usageText}\n`);
  process.exit(1);
}

if (parsedArgs.help) {
  process.stdout.write(`${usageText}\n`);
  process.exit(0);
}

if (parsedArgs.format && !['plain', 'markdown', 'json'].includes(parsedArgs.format)) {
  process.stderr.write(`Неподдерживаемый формат: ${parsedArgs.format}\n${usageText}\n`);
  process.exit(1);
}

const format = parsedArgs.format || 'plain';
const outputPath = parsedArgs.outputPath || null;
const promptSuffix = data.globalConstraints.promptSuffix
  ? data.globalConstraints.promptSuffix.trim()
  : '';
const shouldAppendSuffix = !parsedArgs.disableSuffix && promptSuffix.length > 0;
const appendPromptSuffix = (basePrompt) => {
  const trimmedPrompt = basePrompt.trim();
  if (!shouldAppendSuffix) {
    return trimmedPrompt;
  }
  if (trimmedPrompt.endsWith(promptSuffix)) {
    return trimmedPrompt;
  }
  return `${trimmedPrompt} ${promptSuffix}`;
};

const buildPromptBlock = (promptBlock) => ({
  ...promptBlock,
  prompt: appendPromptSuffix(promptBlock.prompt)
});

const title = 'АРХИТЕКТУРНЫЙ НАБОР ПРОМПТОВ';
const divider = '='.repeat(34);

let output = '';

if (format === 'json') {
  const jsonPayload = {
    promptSuffixApplied: shouldAppendSuffix,
    ...data,
    prompts: {
      exterior: buildPromptBlock(data.prompts.exterior),
      interiors: data.prompts.interiors.map((item) => buildPromptBlock(item)),
      views3d: data.prompts.views3d.map((item) => buildPromptBlock(item)),
      floorPlans: data.prompts.floorPlans.map((item) => buildPromptBlock(item))
    }
  };
  output = `${JSON.stringify(jsonPayload, null, 2)}\n`;
} else {
  if (format === 'markdown') {
    outputLines.push(`# ${title}`);
  } else {
    outputLines.push(title);
    outputLines.push(divider);
  }
  outputLines.push('');
  outputLines.push(format === 'markdown' ? '## Проектные ограничения' : 'Проектные ограничения:');
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
  outputLines.push(format === 'markdown' ? '## Стилистика' : 'Стилистика:');
  outputLines.push(`- Экстерьер: ${data.globalConstraints.style.exterior}`);
  outputLines.push(`- Интерьер: ${data.globalConstraints.style.interior}`);
  outputLines.push(`- Материалы фасада: ${data.globalConstraints.style.materials.join(', ')}`);
  outputLines.push(`- Палитра: ${data.globalConstraints.style.palette.join(', ')}`);
  outputLines.push('');
  outputLines.push(format === 'markdown' ? '## Настройки рендера' : 'Настройки рендера:');
  outputLines.push(`- Качество: ${data.globalConstraints.renderSettings.quality}`);
  outputLines.push(`- Освещение: ${data.globalConstraints.renderSettings.lighting}`);
  outputLines.push(`- Камера: ${data.globalConstraints.renderSettings.camera}`);
  outputLines.push(`- Тени: ${data.globalConstraints.renderSettings.shadows}`);
  outputLines.push('');
  outputLines.push(format === 'markdown' ? '## Обязательные условия' : 'Обязательные условия:');
  for (const item of data.globalConstraints.must) {
    outputLines.push(`- ${item}`);
  }
  outputLines.push('');
  outputLines.push(format === 'markdown' ? '## Запрещено' : 'Запрещено:');
  for (const item of data.globalConstraints.forbidden) {
    outputLines.push(`- ${item}`);
  }
  outputLines.push('');
  outputLines.push(format === 'markdown' ? '## Общая приписка к промптам' : 'Общая приписка к промптам:');
  outputLines.push(`- ${data.globalConstraints.promptSuffix}`);
  outputLines.push('');
  outputLines.push(format === 'markdown' ? '## Список выдачи' : 'Список выдачи:');
  for (const item of data.deliverables) {
    outputLines.push(`- ${item}`);
  }
  outputLines.push('');

  const pushPromptBlock = (sectionTitle, { title: blockTitle, prompt, negative }) => {
    outputLines.push(format === 'markdown' ? `### ${sectionTitle}: ${blockTitle}` : `${sectionTitle}: ${blockTitle}`);
    outputLines.push(format === 'markdown' ? '**PROMPT**:' : 'PROMPT:');
    outputLines.push(appendPromptSuffix(prompt));
    outputLines.push(format === 'markdown' ? '**NEGATIVE**:' : 'NEGATIVE:');
    outputLines.push(negative);
    outputLines.push('');
  };

  pushPromptBlock('Экстерьер', data.prompts.exterior);

  data.prompts.interiors.forEach((item) => pushPromptBlock('Интерьер', item));

  data.prompts.views3d.forEach((item) => pushPromptBlock('3D вид', item));

  data.prompts.floorPlans.forEach((item) => pushPromptBlock('План', item));

  output = outputLines.join('\n');
}

if (outputPath) {
  const resolvedPath = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  fs.writeFileSync(resolvedPath, output, 'utf-8');
} else {
  process.stdout.write(output);
}
