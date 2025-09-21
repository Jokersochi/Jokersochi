import { FC } from 'react';
import { MatchViewState } from '@/store/useGameStore';
import { palette } from '@/theme/palette';

interface AuctionPanelProps {
  match: MatchViewState;
  onBid(auctionId: string, amount: number): void;
}

export const AuctionPanel: FC<AuctionPanelProps> = ({ match, onBid }) => (
  <section
    aria-label="auction-panel"
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      padding: '1rem',
      background: palette.surface,
      color: palette.text,
      borderRadius: '0.75rem',
      minWidth: '320px',
    }}
  >
    <h2 style={{ margin: 0 }}>Active Auctions</h2>
    {Object.values(match.auctions).length === 0 && <span>No auctions yet.</span>}
    {Object.values(match.auctions).map((auction) => (
      <div
        key={auction.id}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          padding: '0.75rem',
          background: palette.background,
          borderRadius: '0.5rem',
        }}
      >
        <strong>{auction.brandSlug}</strong>
        <span>Ends in {Math.max(0, Math.round((auction.expiresAt - Date.now()) / 1000))}s</span>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const formData = new FormData(form);
            const amount = Number(formData.get('amount'));
            if (!Number.isNaN(amount)) {
              onBid(auction.id, amount);
            }
          }}
        >
          <label htmlFor={`bid-${auction.id}`} style={{ display: 'block', marginBottom: '0.5rem' }}>
            Bid amount
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              id={`bid-${auction.id}`}
              name="amount"
              type="number"
              min="0"
              step="1000"
              style={{ flex: 1, padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #475569' }}
            />
            <button type="submit" style={buttonStyle}>
              Bid
            </button>
          </div>
        </form>
      </div>
    ))}
  </section>
);

const buttonStyle: React.CSSProperties = {
  background: palette.accent,
  border: 'none',
  color: palette.text,
  padding: '0.5rem 0.75rem',
  borderRadius: '0.5rem',
  cursor: 'pointer',
};
