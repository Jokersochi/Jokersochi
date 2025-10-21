import { AuctionPanel } from '@/components/AuctionPanel';
import { useGameStore } from '@/store/useGameStore';

export const AuctionScene = () => {
  const { match } = useGameStore((state) => ({
    match: state.match,
  }));
  if (!match) {
    return null;
  }
  return (
    <AuctionPanel
      match={match}
      onBid={(auctionId, amount) =>
        useGameStore.getState().match && window.dispatchEvent(new CustomEvent('auction:bid', { detail: { auctionId, amount } }))
      }
    />
  );
};
