import { FC, useState } from 'react';
import { palette } from '@/theme/palette';

interface ContractPanelProps {
  onSubmit(contract: { assets: string; rentShare: number; buybackPrice?: number }): void;
}

export const ContractPanel: FC<ContractPanelProps> = ({ onSubmit }) => {
  const [assets, setAssets] = useState('tech-giant-apple,commerce-amazon');
  const [rentShare, setRentShare] = useState(0.2);
  const [buyback, setBuyback] = useState(250000);

  return (
    <section
      aria-label="contract-panel"
      style={{
        padding: '1rem',
        background: palette.surface,
        color: palette.text,
        borderRadius: '0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      <h2 style={{ margin: 0 }}>Deal Composer</h2>
      <label htmlFor="assets">Assets (comma separated slugs)</label>
      <input
        id="assets"
        value={assets}
        onChange={(event) => setAssets(event.target.value)}
        style={inputStyle}
      />
      <label htmlFor="rentShare">Rent share</label>
      <input
        id="rentShare"
        type="number"
        min="0"
        max="1"
        step="0.05"
        value={rentShare}
        onChange={(event) => setRentShare(Number(event.target.value))}
        style={inputStyle}
      />
      <label htmlFor="buyback">Buyback price</label>
      <input
        id="buyback"
        type="number"
        min="0"
        step="10000"
        value={buyback}
        onChange={(event) => setBuyback(Number(event.target.value))}
        style={inputStyle}
      />
      <button
        type="button"
        onClick={() =>
          onSubmit({
            assets,
            rentShare,
            buybackPrice: buyback,
          })
        }
        style={{ ...inputStyle, background: palette.primary, color: palette.text, cursor: 'pointer' }}
      >
        Send proposal
      </button>
    </section>
  );
};

const inputStyle: React.CSSProperties = {
  padding: '0.5rem',
  borderRadius: '0.5rem',
  border: '1px solid #475569',
  background: palette.background,
  color: palette.text,
};
