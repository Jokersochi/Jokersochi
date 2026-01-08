import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  collection
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'REPLACE_ME',
  authDomain: 'REPLACE_ME.firebaseapp.com',
  projectId: 'REPLACE_ME',
  storageBucket: 'REPLACE_ME.appspot.com',
  messagingSenderId: 'REPLACE_ME',
  appId: 'REPLACE_ME',
};

const ui = {
  createRoom: document.getElementById('create-room'),
  joinRoom: document.getElementById('join-room'),
  joinForm: document.getElementById('join-form'),
  roomInput: document.getElementById('room-input'),
  confirmJoin: document.getElementById('confirm-join'),
  name: document.getElementById('name-input'),
  boost: document.getElementById('boost-input'),
  presence: document.getElementById('presence-indicator'),
  roomTitle: document.getElementById('room-title'),
  roomCode: document.getElementById('room-code'),
  onlineCount: document.getElementById('online-count'),
  roundTimer: document.getElementById('round-timer'),
  status: document.getElementById('status-bar'),
  leaderboard: document.getElementById('leaderboard'),
  tap: document.getElementById('tap-btn'),
  progress: document.getElementById('progress-bar'),
  pps: document.getElementById('pps'),
  copy: document.getElementById('copy-code'),
  reset: document.getElementById('reset-local'),
  feed: document.getElementById('live-feed')
};

const DEMO_KEY = 'hype-sprint-demo';
let firebaseEnabled = false;
let db;
let unsubscribeRoom;

const state = {
  roomId: 'DEMO',
  nickname: 'Гость',
  clicks: 0,
  history: [],
  combo: 0,
  feed: []
};

function initFirebase() {
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'REPLACE_ME') return;
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    firebaseEnabled = true;
    ui.presence.textContent = 'Онлайн режим';
    logFeed('Firebase подключён. Создавайте приватные комнаты.');
  } catch (err) {
    console.error(err);
    firebaseEnabled = false;
    ui.presence.textContent = 'Оффлайн демо';
    logFeed('Firebase не настроен. Доступен демо‑режим.');
  }
}

function randomRoom() {
  return `ROOM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function hydrateLocal() {
  const saved = localStorage.getItem(DEMO_KEY);
  if (!saved) return;
  const parsed = JSON.parse(saved);
  Object.assign(state, parsed);
}

function persistLocal() {
  localStorage.setItem(DEMO_KEY, JSON.stringify({
    roomId: state.roomId,
    nickname: state.nickname,
    clicks: state.clicks,
    combo: state.combo,
    feed: state.feed.slice(-20)
  }));
}

function setStatus(message, type = 'success') {
  ui.status.textContent = message;
  ui.status.style.background = type === 'error' ? 'rgba(249, 115, 22, 0.08)' : 'rgba(34, 197, 94, 0.08)';
  ui.status.style.color = type === 'error' ? '#fb923c' : '#22c55e';
  ui.status.style.borderColor = type === 'error' ? 'rgba(249, 115, 22, 0.3)' : 'rgba(34, 197, 94, 0.24)';
}

function logFeed(message) {
  const entry = `${new Date().toLocaleTimeString()} — ${message}`;
  state.feed.unshift(entry);
  state.feed = state.feed.slice(0, 12);
  ui.feed.innerHTML = state.feed.map((item) => `<div><strong>Событие</strong> ${item}</div>`).join('');
}

function renderLeaderboard(scores) {
  const sorted = [...scores].sort((a, b) => b.clicks - a.clicks).slice(0, 10);
  ui.leaderboard.innerHTML = sorted
    .map((player, index) => {
      const badgeClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
      const badge = `<span class="badge ${badgeClass}">${index + 1}</span>`;
      const boost = player.boost ? `<span class="pill">x${player.boost}</span>` : '';
      return `<li>${badge}<div><strong>${player.name}</strong><div class="tiny">${player.room}</div></div><div>${player.clicks} ⚡ ${boost}</div></li>`;
    })
    .join('');
}

function updatePps() {
  const now = Date.now();
  state.history = state.history.filter((ts) => now - ts < 4000);
  const perSecond = state.history.length / 4;
  ui.pps.textContent = `${perSecond.toFixed(1)} кликов/с`;
}

async function syncRoom(clickDelta = 0) {
  if (!firebaseEnabled || !db) return;
  const roomRef = doc(db, 'hype-rooms', state.roomId);
  const snapshot = await getDoc(roomRef);
  if (!snapshot.exists()) {
    await setDoc(roomRef, {
      createdAt: serverTimestamp(),
      roundEndsAt: null,
      online: 1,
      lastPing: serverTimestamp()
    });
  } else if (clickDelta === 0) {
    await updateDoc(roomRef, { lastPing: serverTimestamp() });
  }

  const playerRef = doc(db, 'hype-rooms', state.roomId, 'players', state.nickname);
  await setDoc(playerRef, {
    name: state.nickname,
    clicks: state.clicks,
    boost: boostMultiplier(),
    updatedAt: serverTimestamp()
  }, { merge: true });
}

function boostMultiplier() {
  const boost = ui.boost.value.trim();
  if (!boost) return 1;
  return 1 + Math.min(1, boost.length / 20);
}

function updateLocalScores() {
  const demoScores = JSON.parse(localStorage.getItem(`${DEMO_KEY}-scores`) || '[]');
  const existing = demoScores.find((s) => s.name === state.nickname);
  if (existing) {
    existing.clicks = state.clicks;
    existing.boost = boostMultiplier();
  } else {
    demoScores.push({ name: state.nickname, clicks: state.clicks, room: state.roomId, boost: boostMultiplier() });
  }
  localStorage.setItem(`${DEMO_KEY}-scores`, JSON.stringify(demoScores));
  renderLeaderboard(demoScores);
}

function tap() {
  const boost = boostMultiplier();
  state.clicks += 1 * boost;
  state.combo = (state.combo + 1) % 20;
  state.history.push(Date.now());
  const progress = (state.combo / 20) * 100;
  ui.progress.style.width = `${progress}%`;
  if (state.combo === 0) {
    state.clicks += 10 * boost;
    setStatus('Комбо! +10 клик‑монет', 'success');
    logFeed(`${state.nickname} активировал комбо в комнате ${state.roomId}`);
  }
  ui.tap.textContent = `⚡ ${Math.floor(state.clicks)} монет`;
  updatePps();
  updateLocalScores();
  syncRoom(1);
  persistLocal();
}

function bindRoomRealtime() {
  if (!firebaseEnabled || !db) return;
  if (unsubscribeRoom) unsubscribeRoom();
  const roomRef = collection(db, 'hype-rooms', state.roomId, 'players');
  unsubscribeRoom = onSnapshot(query(roomRef, orderBy('clicks', 'desc'), limit(20)), (snap) => {
    const scores = snap.docs.map((doc) => doc.data());
    renderLeaderboard(scores);
    ui.onlineCount.textContent = scores.length.toString();
  });
}

function copyCode() {
  if (!state.roomId) return;
  navigator.clipboard.writeText(state.roomId).then(() => setStatus('Код скопирован, зовите друзей!'));
}

function resetDemo() {
  localStorage.removeItem(DEMO_KEY);
  localStorage.removeItem(`${DEMO_KEY}-scores`);
  Object.assign(state, { roomId: 'DEMO', clicks: 0, combo: 0, feed: [] });
  ui.tap.textContent = '⚡ Блиц‑клик';
  ui.progress.style.width = '0%';
  renderLeaderboard([]);
  setStatus('Демо сброшено. Начните заново!');
}

function joinRoom(roomId) {
  state.roomId = roomId || randomRoom();
  ui.roomCode.textContent = state.roomId;
  ui.roomTitle.textContent = state.roomId === 'DEMO' ? 'Демо режим' : `Комната ${state.roomId}`;
  ui.roundTimer.textContent = '90 сек';
  logFeed(`Присоединились к комнате ${state.roomId}`);
  bindRoomRealtime();
  syncRoom();
  persistLocal();
}

function bindUI() {
  ui.tap.addEventListener('click', tap);
  ui.createRoom.addEventListener('click', () => joinRoom(randomRoom()));
  ui.joinRoom.addEventListener('click', () => ui.joinForm.toggleAttribute('hidden'));
  ui.confirmJoin.addEventListener('click', () => {
    const code = ui.roomInput.value.trim().toUpperCase();
    if (!code) return setStatus('Введите код комнаты', 'error');
    joinRoom(code);
  });
  ui.copy.addEventListener('click', copyCode);
  ui.reset.addEventListener('click', resetDemo);
  ui.name.addEventListener('input', (e) => {
    state.nickname = e.target.value || 'Гость';
    syncRoom();
    persistLocal();
  });
  ui.boost.addEventListener('input', () => {
    updateLocalScores();
    syncRoom();
  });
}

function bootstrap() {
  hydrateLocal();
  ui.name.value = state.nickname;
  ui.roomCode.textContent = state.roomId;
  ui.roomTitle.textContent = state.roomId === 'DEMO' ? 'Демо режим' : `Комната ${state.roomId}`;
  ui.tap.textContent = state.clicks ? `⚡ ${Math.floor(state.clicks)} монет` : '⚡ Блиц‑клик';
  renderLeaderboard(JSON.parse(localStorage.getItem(`${DEMO_KEY}-scores`) || '[]'));
  bindUI();
  initFirebase();
  joinRoom(state.roomId);
  setInterval(updatePps, 800);
}

bootstrap();
