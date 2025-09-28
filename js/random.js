// Генерация случайных чисел и утилиты
export const random = (min, max) => {
    if (typeof min !== 'number' || typeof max !== 'number') return 0;
    if (max < min) [min, max] = [max, min];
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const rollDice = () => {
    const dice1 = random(1, 6);
    const dice2 = random(1, 6);
    return {
        dice1,
        dice2,
        total: dice1 + dice2,
        isDouble: dice1 === dice2
    };
};

export const shuffle = (array) => {
    if (!Array.isArray(array)) return [];
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

export const randomChoice = (array) => {
    if (!Array.isArray(array) || array.length === 0) return null;
    return array[random(0, array.length - 1)];
}; 