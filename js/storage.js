// Работа с localStorage
export const saveToStorage = (key, data) => {
    try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
};

export const loadFromStorage = (key) => {
    try {
        if (typeof localStorage === 'undefined') return null;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        return null;
    }
};

export const removeFromStorage = (key) => {
    try {
        if (typeof localStorage === 'undefined') return;
        localStorage.removeItem(key);
    } catch (error) {
        console.error('Error removing from localStorage:', error);
    }
};

export const isStorageSupported = () => {
    try {
        if (typeof localStorage === 'undefined') return false;
        const test = 'test';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (error) {
        return false;
    }
}; 