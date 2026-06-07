import { fallbackData } from './fallbackData';
import type { BoardCell, Card, GameData } from './types';

const pushUniqueWarning = (warnings: string[], message: string) => {
  if (!warnings.includes(message)) {
    warnings.push(message);
  }
};

const validateDeck = (deck: Card[], name: string, warnings: string[]) => {
  if (deck.length === 0) {
    pushUniqueWarning(warnings, `Колода ${name} пуста.`);
  }

  const seenIds = new Set<string>();
  deck.forEach((card) => {
    if (seenIds.has(card.id)) {
      pushUniqueWarning(warnings, `Колода ${name} содержит дубликат карты ${card.id}.`);
    } else {
      seenIds.add(card.id);
    }
  });
};

const validateGameData = (data: GameData, warnings: string[]) => {
  if (data.board.length === 0) {
    pushUniqueWarning(warnings, 'Поле не содержит клеток — используется резервный набор.');
  }

  const cellIds = new Set<string>();
  let hasStart = false;
  let hasJail = false;

  data.board.forEach((cell) => {
    if (cellIds.has(cell.id)) {
      pushUniqueWarning(warnings, `Клетка с идентификатором ${cell.id} встречается более одного раза.`);
    } else {
      cellIds.add(cell.id);
    }

    if (cell.type === 'start') {
      hasStart = true;
    }

    if (cell.type === 'jail') {
      hasJail = true;
    }
  });

  if (!hasStart) {
    pushUniqueWarning(warnings, 'В наборе данных отсутствует клетка старта.');
  }

  if (!hasJail) {
    pushUniqueWarning(warnings, 'В наборе данных отсутствует клетка тюрьмы.');
  }

  validateDeck(data.chance, '«Шанс»', warnings);
  validateDeck(data.trial, '«Испытание»', warnings);

  if (Object.keys(data.presets).length === 0) {
    pushUniqueWarning(warnings, 'Не удалось найти пресеты экономики.');
  }

  if (Object.keys(data.locales).length === 0) {
    pushUniqueWarning(warnings, 'Не удалось найти локализации интерфейса.');
  }

  if (data.microEvents.length === 0) {
    pushUniqueWarning(warnings, 'Список микро-ивентов пуст.');
  }

  if (data.contracts.length === 0) {
    pushUniqueWarning(warnings, 'Список контрактов пуст.');
  }
};

async function safeImport<T>(path: string, warnings: string[]): Promise<T | undefined> {
  try {
    const module = await import(path);
    return module.default as T;
  } catch (error) {
    warnings.push(`Не удалось загрузить ${path}: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`);
    return undefined;
  }
}

const sortBoard = (cells: BoardCell[]): BoardCell[] =>
  [...cells].sort((a, b) => {
    const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.id.localeCompare(b.id);
  });

const sortCards = (cards: Card[]): Card[] => [...cards].sort((a, b) => a.id.localeCompare(b.id));

export async function loadGameData(): Promise<{ data: GameData; warnings: string[] }> {
  const warnings: string[] = [];

  const [
    board,
    chance,
    trial,
    presets,
    localesRu,
    localesEn,
    localesDe,
    localesEs,
    microEvents,
    contracts
  ] = await Promise.all([
    safeImport('../data/board.json', warnings),
    safeImport('../data/cards.chance.json', warnings),
    safeImport('../data/cards.trial.json', warnings),
    safeImport('../data/presets.json', warnings),
    safeImport('../data/locales/ru.json', warnings),
    safeImport('../data/locales/en.json', warnings),
    safeImport('../data/locales/de.json', warnings),
    safeImport('../data/locales/es.json', warnings),
    safeImport('../data/micro-events.json', warnings),
    safeImport('../data/contracts.json', warnings)
  ]);

  const resolvedBoard = sortBoard(board ?? fallbackData.board);
  const resolvedChance = chance ? sortCards(chance) : sortCards(fallbackData.chance);
  const resolvedTrial = trial ? sortCards(trial) : sortCards(fallbackData.trial);

  const data: GameData = {
    board: resolvedBoard,
    chance: resolvedChance,
    trial: resolvedTrial,
    presets: presets ?? fallbackData.presets,
    locales: {
      ...fallbackData.locales,
      ...(localesRu ? { ru: localesRu } : {}),
      ...(localesEn ? { en: localesEn } : {}),
      ...(localesDe ? { de: localesDe } : {}),
      ...(localesEs ? { es: localesEs } : {})
    },
    microEvents: microEvents ?? fallbackData.microEvents,
    contracts: contracts ?? fallbackData.contracts
  };

  validateGameData(data, warnings);

  return { data, warnings };
}
