import { BoardCell, Card, GameData, GamePreset, MicroEvent, Contract } from './types';

const fallbackBoard: BoardCell[] = [
  { id: 'start', name: 'Старт', type: 'start', description: 'Получите зарплату при проходе.' },
  { id: 'moscow', name: 'Москва', type: 'property', price: 200, rent: 40, category: 'Столица' },
  { id: 'tax-income', name: 'Подоходный налог', type: 'tax', tax: 100 },
  { id: 'chance-1', name: 'Шанс', type: 'chance' },
  { id: 'sochi', name: 'Сочи', type: 'property', price: 120, rent: 16, category: 'Курорты' },
  { id: 'goto-jail', name: 'Отправиться в тюрьму', type: 'gotojail' },
  { id: 'parking', name: 'Свободная стоянка', type: 'parking' }
];

const fallbackCards: Card[] = [
  {
    id: 'chance-mini-1',
    type: 'move',
    text: 'Переместитесь вперёд на 3 клетки.',
    effect: { move: 3 }
  },
  {
    id: 'trial-mini-1',
    type: 'penalty',
    text: 'Заплатите штраф 50₽.',
    effect: { money: -50 }
  }
];

const fallbackPreset: GamePreset = {
  name: 'Быстрый старт',
  description: 'Минимальный набор данных при ошибке загрузки.',
  salary: 200,
  taxRate: 0.1,
  luxuryTax: 75,
  jailFine: 50,
  bailout: 150
};

const fallbackMicroEvents: MicroEvent[] = [
  {
    id: 'micro-1',
    name: 'Региональная субсидия',
    type: 'bonus',
    trigger: 'После каждого полного круга',
    effect: { money: 50 }
  }
];

const fallbackContracts: Contract[] = [
  {
    id: 'contract-1',
    name: 'Лизинг трамвая',
    type: 'lease',
    description: 'Получайте 20₽ в начале хода, уплачивая 5₽ за обслуживание.',
    reward: 20,
    upkeep: 5
  }
];

export const fallbackData: GameData = {
  board: fallbackBoard,
  chance: fallbackCards,
  trial: fallbackCards,
  presets: {
    fallback: fallbackPreset
  },
  locales: {
    ru: {
      START_GAME: 'Начать игру',
      ROLL_DICE: 'Бросить кубики',
      END_TURN: 'Завершить ход'
    }
  },
  microEvents: fallbackMicroEvents,
  contracts: fallbackContracts
};
