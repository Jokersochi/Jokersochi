export const chanceCards = [
  {
    ru: 'Вы выиграли билеты в Большой театр. Получите 50₽.',
    en: 'You won tickets to the Bolshoi Theatre. Collect 50₽.',
    action: player => { player.money += 50; }
  },
  {
    ru: 'Транссибирское путешествие! Переместитесь на клетку "Сочи".',
    en: 'Trans-Siberian travel! Move to "Sochi" square.',
    action: (player, board) => {
      const sochi = board.find(s => s.name.ru === 'Сочи');
      player.position = sochi.id;
    }
  },
  {
    ru: 'Снежная буря в Сибири. Пропустите ход.',
    en: 'Snow storm in Siberia. Skip a turn.',
    action: player => { player.skip = true; }
  }
];

export const treasuryCards = [
  {
    ru: 'Экономический бум! Получите 100₽.',
    en: 'Economic boom! Collect 100₽.',
    action: player => { player.money += 100; }
  },
  {
    ru: 'Культурный фестиваль. Доход с собственности увеличен на 50% в этот ход.',
    en: 'Cultural festival. Property income increased by 50% this turn.',
    action: player => { player.bonusRent = 1.5; }
  }
];

export function drawCard(deck) {
  const index = Math.floor(Math.random() * deck.length);
  return deck[index];
}
