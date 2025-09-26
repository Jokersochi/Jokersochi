// Базовые утилиты
export const isEven = (num) => num % 2 === 0;
export const isOdd = (num) => Math.abs(num) % 2 === 1;
export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
export const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (Array.isArray(obj)) return obj.map(deepClone);
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
};
export const formatMoney = (amount, currency = '₽') => `${amount.toLocaleString()}${currency}`;
export const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};
export const generateId = () => {
    const time = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2);
    return `${time}${rand}`;
};