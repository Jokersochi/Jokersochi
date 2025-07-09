// js/chat.js
// Базовый чат между игроками (localStorage, авто-scroll, современный UI)

const CHAT_STORAGE_KEY = 'monopoly_chat_messages';

function getMessages() {
  try {
    return JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveMessages(messages) {
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
}

function renderMessages() {
  const messages = getMessages();
  const chatList = document.getElementById('chat-messages');
  if (!chatList) return;
  chatList.innerHTML = '';
  messages.forEach(msg => {
    const div = document.createElement('div');
    div.className = 'chat-message';
    div.innerHTML = `<span class="chat-user">${msg.user || 'Игрок'}</span>: <span class="chat-text">${msg.text}</span>`;
    chatList.appendChild(div);
  });
  chatList.scrollTop = chatList.scrollHeight;
}

function sendMessage(user, text) {
  if (!text.trim()) return;
  const messages = getMessages();
  messages.push({ user, text, time: Date.now() });
  saveMessages(messages);
  renderMessages();
}

function setupChatUI() {
  const chatInput = document.getElementById('chat-input');
  const chatSend = document.getElementById('chat-send');
  chatSend.onclick = () => {
    sendMessage('Вы', chatInput.value);
    chatInput.value = '';
    chatInput.focus();
  };
  chatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      sendMessage('Вы', chatInput.value);
      chatInput.value = '';
    }
  });
  renderMessages();
}

window.addEventListener('DOMContentLoaded', setupChatUI);
window.addEventListener('storage', renderMessages); // синхронизация между вкладками 