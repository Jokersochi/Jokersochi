import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '@/store/useGameStore';
import { useSocket } from '@/hooks/useSocket';
import { transformMatchSnapshot } from '@/utils/match';
import { BoardCanvas } from '@/components/BoardCanvas';
import { PlayerSidebar } from '@/components/PlayerSidebar';
import { DriveMeter } from '@/components/DriveMeter';
import { AuctionPanel } from '@/components/AuctionPanel';
import { ContractPanel } from '@/components/ContractPanel';
import { TopBar } from '@/components/TopBar';
import { TutorialPanel } from '@/components/TutorialPanel';
import { palette } from '@/theme/palette';

export const GameScene = () => {
  const { t } = useTranslation();
  const { match, localMatchPlayerId, updateMatch, advanceTutorial, tutorialStep } = useGameStore((state) => ({
    match: state.match,
    localMatchPlayerId: state.localMatchPlayerId,
    updateMatch: state.updateMatch,
    advanceTutorial: state.advanceTutorial,
    tutorialStep: state.tutorialStep,
  }));

  const playerId = localStorage.getItem('playerId') ?? 'guest';
  const matchSocket = useSocket({
    namespace: '/match',
    auth: match
      ? { matchId: match.id, matchPlayerId: localMatchPlayerId ?? match.activeTurn, playerId }
      : undefined,
    onConnect: (socket) => {
      socket.emit('sync_state');
    },
  });

  useEffect(() => {
    if (!matchSocket || !match) return;

    const handleState = (payload: any) => {
      updateMatch(transformMatchSnapshot(payload, localMatchPlayerId ?? playerId));
    };
    const handleTurn = (payload: any) => {
      if (payload?.snapshot) {
        updateMatch(transformMatchSnapshot(payload.snapshot, localMatchPlayerId ?? playerId));
        return;
      }

      matchSocket.emit('sync_state', (snapshot: any) => {
        updateMatch(transformMatchSnapshot(snapshot, localMatchPlayerId ?? playerId));
      });
    };
    matchSocket.on('match_state', handleState);
    matchSocket.on('turn_result', handleTurn);
    return () => {
      matchSocket.off('match_state', handleState);
      matchSocket.off('turn_result', handleTurn);
    };
  }, [matchSocket, match, updateMatch, localMatchPlayerId, playerId]);

  if (!match) {
    return <div style={{ color: palette.text, padding: '2rem' }}>Loading match...</div>;
  }

  const localPlayer = match.players.find((player) => player.isLocal) ?? match.players[0];

  return (
    <div style={{ background: palette.background, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TopBar
        match={match}
        onOpenAuction={() => {}}
        onOpenContracts={() => {}}
        onOpenTutorial={() => advanceTutorial()}
      />
      <main style={{ display: 'flex', flex: 1 }}>
        <div style={{ flex: 1, position: 'relative', padding: '1rem' }}>
          <BoardCanvas match={match} />
          <TutorialPanel step={tutorialStep} onNext={advanceTutorial} />
        </div>
        <div
          style={{
            width: '420px',
            background: palette.surface,
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <DriveMeter value={localPlayer.driveCounter} label={t('game.drive')} />
          <button type="button" style={buttonStyle} onClick={() => matchSocket?.emit('take_turn')}>
            {t('game.yourTurn')}
          </button>
          <AuctionPanel
            match={match}
            onBid={(auctionId, amount) => matchSocket?.emit('auction_bid', { auctionId, amount })}
          />
          <ContractPanel
            onSubmit={(proposal) =>
              matchSocket?.emit('contract_offer', {
                counterpartyId: null,
                proposal: {
                  assets: proposal.assets.split(',').map((asset) => asset.trim()),
                  rentShare: proposal.rentShare,
                  buybackPrice: proposal.buybackPrice,
                },
              })
            }
          />
        </div>
        <PlayerSidebar match={match} />
      </main>
    </div>
  );
};

const buttonStyle: React.CSSProperties = {
  background: palette.primary,
  color: palette.text,
  border: 'none',
  padding: '0.75rem 1rem',
  borderRadius: '0.75rem',
  cursor: 'pointer',
  fontWeight: 600,
  textAlign: 'center',
};
