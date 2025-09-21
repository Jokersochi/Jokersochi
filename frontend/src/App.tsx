import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '@/store/useGameStore';
import { LobbyScene } from '@/scenes/LobbyScene';
import { GameScene } from '@/scenes/GameScene';
import { palette } from '@/theme/palette';

export const App = () => {
  const { view } = useGameStore((state) => ({ view: state.view }));
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t('title');
  }, [t]);

  return (
    <div style={{ minHeight: '100vh', background: palette.background }}>
      <a href="#main" style={skipLinkStyle}>
        {t('accessibility.skip')}
      </a>
      <main id="main">
        {view === 'lobby' && <LobbyScene />}
        {view === 'game' && <GameScene />}
      </main>
    </div>
  );
};

const skipLinkStyle: React.CSSProperties = {
  position: 'absolute',
  left: '-10000px',
  top: 'auto',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  background: palette.accent,
  color: palette.text,
  padding: '0.5rem 1rem',
};
