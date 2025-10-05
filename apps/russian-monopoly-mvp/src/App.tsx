import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadGameData } from './config/dataLoader';
import { tokens as tokenOptions, defaultNames } from './config/constants';
import { useGameStore } from './store/gameStore';
import { SetupPanel } from './components/SetupPanel';
import { BoardView } from './components/BoardView';
import { PlayerSidebar } from './components/PlayerSidebar';
import { ControlPanel } from './components/ControlPanel';
import { LogPanel } from './components/LogPanel';
import { CardOverlay } from './components/CardOverlay';
import { WarningsBanner } from './components/WarningsBanner';
import { ReferencePanel } from './components/ReferencePanel';

const defaultLocaleStrings: Record<string, string> = {
  SETUP_HEADING: 'Подготовка партии',
  SETUP_SUBHEADING: 'Настройте количество игроков, пресет экономики и фишки.',
  PLAYER_COUNT: 'Количество игроков',
  PLAYER_COUNT_HINT: 'Допускается от 2 до 6 участников.',
  PRESET_LABEL: 'Экономический пресет',
  PLAYER_CARD_LABEL: 'Игрок',
  PLAYER: 'Игрок',
  PLAYER_NAME: 'Имя игрока',
  TOKEN: 'Фишка',
  START_GAME: 'Начать игру',
  LOADING_LABEL: 'Загрузка…',
  CONTROL_PANEL: 'Панель управления',
  RESET_GAME: 'Сбросить партию',
  ROLL_DICE: 'Бросить кубики',
  END_TURN: 'Завершить ход',
  PURCHASE_PROMPT: 'Купить за',
  CONFIRM: 'Купить',
  DECLINE: 'Отказаться',
  RESOLVE_CARD: 'Применить карту',
  PHASE_PURCHASE: 'Ожидается решение о покупке.',
  PHASE_CARD: 'Прочтите карту и примените эффект.',
  PHASE_IDLE: 'Ожидание действий игрока.',
  CARD_DRAWN_TITLE: 'Вы вытянули карту!',
  PLAYERS_HEADING: 'Игроки',
  TURN_PHASE: 'Фаза',
  BALANCE: 'Баланс',
  IN_JAIL: 'В тюрьме',
  PROPERTIES_COUNT: 'Объекты',
  CONTRACTS_COUNT: 'Контракты',
  FREE_JAIL_CARDS: 'Карт выхода из тюрьмы',
  PRESET_FOOTER: 'Текущий пресет',
  SALARY_LABEL: 'Зарплата за старт',
  JAIL_FINE_LABEL: 'Штраф за выход',
  LOG_HEADING: 'Журнал событий',
  LOG_ENTRIES: 'записей',
  CARD_DRAWN: 'Карта вытянута',
  PLAYER_COUNT_LABEL: 'Игроков',
  REFERENCE_HEADING: 'Памятка по событиям',
  MICRO_EVENTS_HEADING: 'Микро-ивенты',
  CONTRACTS_HEADING: 'Контракты',
  TRIGGER_LABEL: 'Триггер',
  EFFECT_MONEY: 'Изменение бюджета',
  EFFECT_MOVE: 'Передвижение',
  REWARD_LABEL: 'Вознаграждение',
  UPKEEP_LABEL: 'Обслуживание'
};

function useTranslation() {
  const locales = useGameStore((state) => state.locales);
  const selectedLocale = useGameStore((state) => state.selectedLocale);

  return useCallback(
    (key: string) =>
      locales[selectedLocale]?.[key] ?? locales['ru']?.[key] ?? defaultLocaleStrings[key] ?? key,
    [locales, selectedLocale]
  );
}

export default function App() {
  const [loadWarnings, setLoadWarnings] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const loadData = useGameStore((state) => state.loadData);
  const board = useGameStore((state) => state.board);
  const players = useGameStore((state) => state.players);
  const currentPlayerIndex = useGameStore((state) => state.currentPlayerIndex);
  const turnPhase = useGameStore((state) => state.turnPhase);
  const dice = useGameStore((state) => state.dice);
  const log = useGameStore((state) => state.log);
  const isGameStarted = useGameStore((state) => state.isGameStarted);
  const pendingPurchase = useGameStore((state) => state.pendingPurchase);
  const pendingCard = useGameStore((state) => state.pendingCard);
  const setPreset = useGameStore((state) => state.setPreset);
  const setLocale = useGameStore((state) => state.setLocale);
  const setupGame = useGameStore((state) => state.setupGame);
  const rollDice = useGameStore((state) => state.rollDice);
  const purchaseProperty = useGameStore((state) => state.purchaseProperty);
  const declinePurchase = useGameStore((state) => state.declinePurchase);
  const resolveCard = useGameStore((state) => state.resolveCard);
  const endTurn = useGameStore((state) => state.endTurn);
  const resetGame = useGameStore((state) => state.resetGame);
  const presets = useGameStore((state) => state.presets);
  const selectedPreset = useGameStore((state) => state.selectedPreset);
  const locales = useGameStore((state) => state.locales);
  const selectedLocale = useGameStore((state) => state.selectedLocale);
  const gameConfig = useGameStore((state) => state.gameConfig);
  const microEvents = useGameStore((state) => state.microEvents);
  const contracts = useGameStore((state) => state.contracts);
  const warningsFromStore = useGameStore((state) => state.warnings);

  const t = useTranslation();

  useEffect(() => {
    (async () => {
      const result = await loadGameData();
      loadData(result);
      setLoadWarnings(result.warnings);
      setIsLoading(false);
    })();
  }, [loadData]);

  const localeOptions = useMemo(() => Object.keys(locales), [locales]);

  const currentPlayer = players[currentPlayerIndex];

  const combinedWarnings = useMemo(
    () => [...new Set([...(warningsFromStore ?? []), ...loadWarnings])],
    [warningsFromStore, loadWarnings]
  );

  const handleStart = useCallback(
    (playerConfigs: { name: string; token: string }[], presetKey: string) => {
      setupGame(playerConfigs, presetKey);
    },
    [setupGame]
  );

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="border-b border-slate-200 bg-surface/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Русская Монополия — Прототип</h1>
            <p className="text-sm text-slate-500">
              Офлайн-партия на одном устройстве. Данные берутся из локальных JSON-файлов.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <span>{t('PRESET_LABEL')}</span>
              <select
                value={selectedPreset}
                onChange={(event) => setPreset(event.currentTarget.value)}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2"
              >
                {Object.entries(presets).map(([key, preset]) => (
                  <option key={key} value={key}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <span>Язык</span>
              <select
                value={selectedLocale}
                onChange={(event) => setLocale(event.currentTarget.value)}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2"
              >
                {localeOptions.map((locale) => (
                  <option key={locale} value={locale}>
                    {locale.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </header>
      <main className="mx-auto mt-6 flex max-w-7xl flex-col gap-6 px-4">
        <WarningsBanner warnings={combinedWarnings} />
        {!isGameStarted ? (
          <SetupPanel
            tokens={tokenOptions}
            defaultNames={defaultNames}
            presets={presets}
            selectedPreset={selectedPreset}
            onPresetChange={setPreset}
            onStart={handleStart}
            isLoading={isLoading}
            t={t}
          />
        ) : (
          <div className="flex flex-col gap-6 lg:flex-row">
            <BoardView
              board={board}
              players={players}
              activeCellId={currentPlayer?.position !== undefined ? board[currentPlayer.position]?.id : undefined}
              currentPlayerId={currentPlayer?.id}
            />
            <div className="flex w-full max-w-md flex-col gap-6">
              <PlayerSidebar
                players={players}
                currentPlayerId={currentPlayer?.id}
                turnPhase={turnPhase}
                dice={dice}
                tokens={tokenOptions}
                preset={gameConfig}
                t={t}
              />
              <ControlPanel
                turnPhase={turnPhase}
                onRoll={rollDice}
                onPurchase={purchaseProperty}
                onDecline={declinePurchase}
                onResolve={resolveCard}
                onEndTurn={endTurn}
                onReset={resetGame}
                pendingPurchase={pendingPurchase}
                pendingCard={pendingCard}
                t={t}
              />
            </div>
          </div>
        )}
        {isGameStarted && (
          <>
            <LogPanel log={log} t={t} />
            <ReferencePanel microEvents={microEvents} contracts={contracts} t={t} />
          </>
        )}
      </main>
      {pendingCard && <CardOverlay card={pendingCard} onResolve={resolveCard} t={t} />}
    </div>
  );
}
