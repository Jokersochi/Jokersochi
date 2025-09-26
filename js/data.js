// Placeholder data for board tiles, cards, players and events
const boardTiles = [
  { id: 0, name: { en: 'Start', ru: 'Старт' }, price: 0, rent: 0 },
  { id: 1, name: { en: 'Moscow', ru: 'Москва' }, color: 'red', price: 100, baseRent: 10, rent: 10, residenceCost: 100, upgradeCost: 50, upgrades: 0 },
  { id: 2, name: { en: 'Chance', ru: 'Шанс' }, type: 'chance' },
  { id: 3, name: { en: 'Saint Petersburg', ru: 'Санкт-Петербург' }, color: 'red', price: 120, baseRent: 12, rent: 12, residenceCost: 100, upgradeCost: 60, upgrades: 0 },
  { id: 4, name: { en: 'Tax', ru: 'Налог' }, type: 'tax', amount: 50 },
  { id: 5, name: { en: 'Sochi', ru: 'Сочи' }, color: 'blue', price: 80, baseRent: 8, rent: 8, residenceCost: 80, upgradeCost: 40, upgrades: 0 },
  { id: 6, name: { en: 'Treasury', ru: 'Казна' }, type: 'treasury' },
  { id: 7, name: { en: 'Novosibirsk', ru: 'Новосибирск' }, color: 'blue', price: 90, baseRent: 9, rent: 9, residenceCost: 80, upgradeCost: 45, upgrades: 0 },
  { id: 8, name: { en: 'Kazan', ru: 'Казань' }, color: 'green', price: 110, baseRent: 11, rent: 11, residenceCost: 100, upgradeCost: 55, upgrades: 0 },
  { id: 9, name: { en: 'Yekaterinburg', ru: 'Екатеринбург' }, color: 'green', price: 120, baseRent: 12, rent: 12, residenceCost: 100, upgradeCost: 60, upgrades: 0 },
  { id: 10, name: { en: 'Chance', ru: 'Шанс' }, type: 'chance' },
];

const chanceCards = [
  { en: 'You won tickets to the Bolshoi Theater! Collect 50.', ru: 'Вы выиграли билеты в Большой театр! Получите 50.', effect: p => p.money += 50 },
  { en: 'Trans-Siberian journey. Pay 30.', ru: 'Транссибирское путешествие. Заплатите 30.', effect: p => p.money -= 30 },
  { en: 'Kremlin tour. Advance to Moscow.', ru: 'Экскурсия в Кремль. Перейдите в Москву.', effect: p => p.position = 1 },
  { en: 'Pay tribute to the Hermitage. Pay 40.', ru: 'Отдайте дань Эрмитажу. Заплатите 40.', effect: p => p.money -= 40 },
  { en: 'Baikal cruise! Collect 70.', ru: 'Круиз по Байкалу! Получите 70.', effect: p => p.money += 70 },
];

const treasuryCards = [
  { en: 'Receive inheritance. Collect 100.', ru: 'Получите наследство. Получите 100.', effect: p => p.money += 100 },
  { en: 'Repair the Red Square. Pay 50.', ru: 'Оплатите ремонт Красной площади. Заплатите 50.', effect: p => p.money -= 50 },
  { en: 'Volga expedition! Advance to Sochi.', ru: 'Экспедиция по Волге! Перейдите в Сочи.', effect: p => p.position = 5 },
];

const randomEvents = [
  { en: 'Economic boom! Rent +50%.', ru: 'Экономический бум! Аренда +50%.', effect: m => m.rent = 1.5 },
  { en: 'Economic crisis! Rent -50%.', ru: 'Экономический кризис! Аренда -50%.', effect: m => m.rent = 0.5 },
  { en: 'Snow storm in Siberia. Move only 1 tile.', ru: 'Снежная буря в Сибири. Ход только на 1 клетку.', effect: m => m.movement = 1 },
  { en: 'Summer festival! Rent doubled this turn.', ru: 'Летний фестиваль! Аренда удвоена.', effect: m => m.rent = 2 },
  { en: 'Golden Autumn! Move +2 tiles.', ru: 'Золотая осень! Ход +2 клетки.', effect: m => m.movementBonus = 2 },
  null, // sometimes no event occurs
];

const playerTemplates = [
  { id: 0, name: 'Player 1', token: '🎩', position: 0, money: 1500, properties: [] },
  { id: 1, name: 'Player 2', token: '🐻', position: 0, money: 1500, properties: [] },
  { id: 2, name: 'Player 3', token: '🪆', position: 0, money: 1500, properties: [] },
  { id: 3, name: 'Player 4', token: '🪗', position: 0, money: 1500, properties: [] },
];
