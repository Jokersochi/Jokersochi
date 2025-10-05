import { fallbackData } from './fallbackData';
import type { BoardCell, Card, GameData } from './types';

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

  return { data, warnings };
}
