// Утилиты для работы с UI и DOM

export const escapeHTML = (str) => String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

export const showToast = (msg, type = 'info', duration = 2500) => {
  // Можно доработать под кастомный toast, пока alert как fallback
  if (typeof window.createCustomToast === 'function') {
    window.createCustomToast(msg, type, duration);
  } else {
    alert(msg);
  }
};

export const showNotification = (message, type = 'info', duration = 3000) => {
  // Можно доработать под кастомные уведомления
  showToast(message, type, duration);
};

export const passedStart = (oldPos, newPos) => newPos < oldPos; 