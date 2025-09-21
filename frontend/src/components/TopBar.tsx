import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { palette } from '@/theme/palette';
import { MatchViewState } from '@/store/useGameStore';

interface TopBarProps {
  match: MatchViewState;
  onOpenAuction(): void;
  onOpenContracts(): void;
  onOpenTutorial(): void;
}

export const TopBar: FC<TopBarProps> = ({ match, onOpenAuction, onOpenContracts, onOpenTutorial }) => {
  const { t } = useTranslation();
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        background: palette.surface,
        color: palette.text,
        borderBottom: `1px solid ${palette.muted}`,
      }}
    >
      <div>
        <h1 style={{ margin: 0, fontSize: '1.2rem' }}>{t('title')}</h1>
        <span style={{ fontSize: '0.85rem', color: palette.muted }}>
          Round {match.round} · Active turn: {match.activeTurn}
        </span>
      </div>
      <nav style={{ display: 'flex', gap: '0.5rem' }} aria-label="match-toolbar">
        <button type="button" onClick={onOpenAuction} style={buttonStyle}>
          {t('game.auction')}
        </button>
        <button type="button" onClick={onOpenContracts} style={buttonStyle}>
          {t('game.contracts')}
        </button>
        <button type="button" onClick={onOpenTutorial} style={buttonStyle}>
          {t('game.tutorial')}
        </button>
      </nav>
    </header>
  );
};

const buttonStyle: React.CSSProperties = {
  background: palette.primary,
  color: palette.text,
  border: 'none',
  padding: '0.5rem 0.75rem',
  borderRadius: '0.5rem',
  cursor: 'pointer',
  fontWeight: 600,
};
