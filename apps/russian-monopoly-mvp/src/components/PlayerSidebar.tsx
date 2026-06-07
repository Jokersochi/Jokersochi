import type { PlayerState, TurnPhase } from '../store/gameStore';
import type { GamePreset } from '../config/types';

interface TokenOption {
  id: string;
  name: string;
  asset: string;
}

interface PlayerSidebarProps {
  players: PlayerState[];
  currentPlayerId?: string;
  turnPhase: TurnPhase;
  dice: [number, number];
  tokens: TokenOption[];
  preset: GamePreset;
  t: (key: string) => string;
}

const formatMoney = (value: number) => `${value.toLocaleString('ru-RU')}₽`;

export function PlayerSidebar({
  players,
  currentPlayerId,
  turnPhase,
  dice,
  tokens,
  preset,
  t
}: PlayerSidebarProps) {
  const tokenMap = new Map(tokens.map((token) => [token.id, token]));

  return (
    <aside className="w-full max-w-sm rounded-3xl bg-surface p-4 shadow-soft" aria-labelledby="players-heading">
      <header className="mb-4 flex items-center justify-between">
        <h2 id="players-heading" className="text-lg font-semibold text-slate-700">
          {t('PLAYERS_HEADING')}
        </h2>
        <div className="flex items-center gap-2 text-xs text-slate-500" aria-live="polite">
          <span>{t('TURN_PHASE')}: {turnPhase}</span>
          <span>
            🎲 {dice[0]} + {dice[1]}
          </span>
        </div>
      </header>
      <ul className="flex flex-col gap-3">
        {players.map((player) => {
          const token = tokenMap.get(player.token);
          const isActive = player.id === currentPlayerId;
          return (
            <li
              key={player.id}
              className={`flex flex-col gap-3 rounded-2xl border p-3 transition ${
                isActive ? 'border-accent bg-accent/10' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                {token ? (
                  <img
                    src={token.asset}
                    alt={token.name}
                    className="h-10 w-10 rounded-full bg-slate-100 p-2"
                  />
                ) : (
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-sm font-semibold">
                    {player.name.charAt(0)}
                  </span>
                )}
                <div>
                  <p className="text-sm font-semibold text-slate-700">{player.name}</p>
                  <p className="text-xs text-slate-500">{t('BALANCE')}: {formatMoney(player.balance)}</p>
                  {player.inJail && (
                    <p className="text-xs text-danger">{t('IN_JAIL')}</p>
                  )}
                </div>
              </div>
              <div className="grid gap-2 text-xs text-slate-500">
                <p>{t('PROPERTIES_COUNT')}: {player.properties.length}</p>
                <p>{t('CONTRACTS_COUNT')}: {player.contracts.length}</p>
                <p>{t('FREE_JAIL_CARDS')}: {player.freeJailCards}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <footer className="mt-6 rounded-2xl bg-slate-100 p-3 text-xs text-slate-500">
        <p>{t('PRESET_FOOTER')}: {preset.name}</p>
        <p>{t('SALARY_LABEL')}: {formatMoney(preset.salary)}</p>
        <p>{t('JAIL_FINE_LABEL')}: {formatMoney(preset.jailFine)}</p>
      </footer>
    </aside>
  );
}
