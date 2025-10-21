import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { MatchViewState, PlayerState } from '@/store/useGameStore';
import { palette } from '@/theme/palette';

interface PlayerSidebarProps {
  match: MatchViewState;
}

export const PlayerSidebar: FC<PlayerSidebarProps> = ({ match }) => {
  const { t } = useTranslation();
  return (
    <aside
      aria-label="player-status"
      style={{
        width: '260px',
        background: palette.surface,
        color: palette.text,
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        borderLeft: `2px solid ${palette.muted}`,
      }}
    >
      <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{t('game.waiting')}</h2>
      {match.players.map((player) => (
        <PlayerRow key={player.id} player={player} active={match.activeTurn === player.id} />
      ))}
    </aside>
  );
};

interface PlayerRowProps {
  player: PlayerState;
  active: boolean;
}

const PlayerRow: FC<PlayerRowProps> = ({ player, active }) => (
  <div
    style={{
      padding: '0.75rem',
      background: active ? palette.primary : 'transparent',
      borderRadius: '0.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.25rem',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontWeight: 600 }}>{player.displayName}</span>
      <span>{new Intl.NumberFormat().format(player.cash)}</span>
    </div>
    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem' }}>
      <span>🚀 {player.driveCounter}</span>
      <span>💼 {player.reputation.toFixed(2)}</span>
      <span>🤝 {player.trust}</span>
    </div>
  </div>
);
