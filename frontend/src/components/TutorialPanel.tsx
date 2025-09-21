import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { palette } from '@/theme/palette';

interface TutorialPanelProps {
  step: number;
  onNext(): void;
}

const steps: Array<(t: (key: string) => string) => string> = [
  (t) => t('tutorial.step1'),
  (t) => t('tutorial.step2'),
  (t) => t('tutorial.step3'),
];

export const TutorialPanel: FC<TutorialPanelProps> = ({ step, onNext }) => {
  const { t } = useTranslation();
  const message = steps[step] ? steps[step](t) : steps[0](t);

  return (
    <section
      style={{
        position: 'absolute',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        background: palette.surface,
        color: palette.text,
        padding: '1rem 1.5rem',
        borderRadius: '999px',
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.35)',
      }}
      role="status"
    >
      <span>{message}</span>
      <button type="button" onClick={onNext} style={buttonStyle}>
        →
      </button>
    </section>
  );
};

const buttonStyle: React.CSSProperties = {
  width: '2.5rem',
  height: '2.5rem',
  borderRadius: '50%',
  border: 'none',
  background: palette.primary,
  color: palette.text,
  cursor: 'pointer',
  fontSize: '1.2rem',
  fontWeight: 700,
};
