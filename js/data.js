// Placeholder data for board tiles, chance cards, players and events
const boardTiles = [
  { id: 0, name: { en: 'Start', ru: 'Старт' }, price: 0, rent: 0 },
  { id: 1, name: { en: 'Moscow', ru: 'Москва' }, color: 'red', price: 100, rent: 10, residenceCost: 100 },
  { id: 2, name: { en: 'Chance', ru: 'Шанс' }, type: 'chance' },
  { id: 3, name: { en: 'Saint Petersburg', ru: 'Санкт-Петербург' }, color: 'red', price: 120, rent: 12, residenceCost: 100 },
  { id: 4, name: { en: 'Tax', ru: 'Налог' }, type: 'tax', amount: 50 },
  { id: 5, name: { en: 'Sochi', ru: 'Сочи' }, color: 'blue', price: 80, rent: 8, residenceCost: 80 },
  { id: 6, name: { en: 'Chance', ru: 'Шанс' }, type: 'chance' },
  { id: 7, name: { en: 'Novosibirsk', ru: 'Новосибирск' }, color: 'blue', price: 90, rent: 9, residenceCost: 80 },
  { id: 8, name: { en: 'Kazan', ru: 'Казань' }, color: 'green', price: 110, rent: 11, residenceCost: 100 },
  { id: 9, name: { en: 'Yekaterinburg', ru: 'Екатеринбург' }, color: 'green', price: 120, rent: 12, residenceCost: 100 },
];

const chanceCards = [
  { en: 'You won tickets to the Bolshoi Theater! Collect 50.', ru: 'Вы выиграли билеты в Большой театр! Получите 50.', effect: p => p.money += 50 },
  { en: 'Trans-Siberian journey. Pay 30.', ru: 'Транссибирское путешествие. Заплатите 30.', effect: p => p.money -= 30 },
  { en: 'Kremlin tour. Advance to Moscow.', ru: 'Экскурсия в Кремль. Перейдите в Москву.', effect: p => p.position = 1 },
  { en: 'Pay tribute to the Hermitage. Pay 40.', ru: 'Отдайте дань Эрмитажу. Заплатите 40.', effect: p => p.money -= 40 },
];

const randomEvents = [
  { en: 'Economic boom! Rent +50%.', ru: 'Экономический бум! Аренда +50%.', effect: m => m.rent = 1.5 },
  { en: 'Economic crisis! Rent -50%.', ru: 'Экономический кризис! Аренда -50%.', effect: m => m.rent = 0.5 },
  { en: 'Snow storm in Siberia. Move only 1 tile.', ru: 'Снежная буря в Сибири. Ход только на 1 клетку.', effect: m => m.movement = 1 },
  { en: 'Summer festival! Rent doubled this turn.', ru: 'Летний фестиваль! Аренда удвоена.', effect: m => m.rent = 2 },
  null, // sometimes no event occurs
];

const playerTemplates = [
  { id: 0, name: 'Player 1', token: '🎩', position: 0, money: 1500, properties: [] },
  { id: 1, name: 'Player 2', token: '🐻', position: 0, money: 1500, properties: [] },
];
