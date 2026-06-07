import { useEffect, useRef } from 'react';
import type { Card } from '../config/types';

interface CardOverlayProps {
  card: Card;
  onResolve: () => void;
  t: (key: string) => string;
}

export function CardOverlay({ card, onResolve, t }: CardOverlayProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="card-overlay-heading"
    >
      <article className="w-full max-w-md rounded-3xl bg-white p-6 shadow-soft">
        <header className="mb-4">
          <h2 id="card-overlay-heading" className="text-xl font-semibold text-slate-700">
            {t('CARD_DRAWN_TITLE')}
          </h2>
          {card.title && <p className="text-sm font-semibold text-slate-600">{card.title}</p>}
          <p className="text-xs uppercase tracking-wide text-slate-400">{card.type}</p>
        </header>
        <p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-700">{card.text}</p>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onResolve}
          className="mt-6 w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-accent/90 focus-visible:outline-none"
        >
          {t('RESOLVE_CARD')}
        </button>
      </article>
    </div>
  );
}
