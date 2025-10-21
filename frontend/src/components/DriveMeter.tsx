import { FC } from 'react';
import { palette } from '@/theme/palette';

interface DriveMeterProps {
  value: number;
  label: string;
}

export const DriveMeter: FC<DriveMeterProps> = ({ value, label }) => {
  const normalized = Math.min(Math.max(value / 10, 0), 1);
  return (
    <div aria-label={label} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <span style={{ color: palette.text, fontSize: '0.9rem' }}>{label}</span>
      <div
        style={{
          width: '100%',
          height: '12px',
          background: palette.surface,
          borderRadius: '999px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${normalized * 100}%`,
            height: '100%',
            background: palette.accent,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
};
