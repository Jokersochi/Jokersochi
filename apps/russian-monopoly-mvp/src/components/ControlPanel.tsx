import type { PendingPurchase, TurnPhase } from '../store/gameStore';
import type { Card } from '../config/types';

interface ControlPanelProps {
  turnPhase: TurnPhase;
  onRoll: () => void;
  onPurchase: () => void;
  onDecline: () => void;
  onResolve: () => void;
  onEndTurn: () => void;
  onReset: () => void;
  pendingPurchase?: PendingPurchase;
  pendingCard?: Card;
  t: (key: string) => string;
}

export function ControlPanel({
  turnPhase,
  onRoll,
  onPurchase,
  onDecline,
  onResolve,
  onEndTurn,
  onReset,
  pendingPurchase,
  pendingCard,
  t
}: ControlPanelProps) {
  return (
    <section
      className="rounded-3xl bg-surface p-4 shadow-soft"
      aria-labelledby="control-panel-heading"
    >
      <header className="mb-4 flex items-center justify-between">
        <h2 id="control-panel-heading" className="text-lg font-semibold text-slate-700">
          {t('CONTROL_PANEL')}
        </h2>
        <button
          type="button"
          className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-danger hover:text-danger"
          onClick={onReset}
        >
          {t('RESET_GAME')}
        </button>
      </header>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onRoll}
          disabled={turnPhase !== 'idle'}
          className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {t('ROLL_DICE')}
        </button>
        <button
          type="button"
          onClick={onEndTurn}
          disabled={turnPhase === 'setup'}
          className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
        >
          {t('END_TURN')}
        </button>
        {pendingPurchase && (
          <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-xs text-slate-600">
            <span>
              {t('PURCHASE_PROMPT')} {pendingPurchase.price}₽
            </span>
            <button
              type="button"
              onClick={onPurchase}
              className="rounded-2xl bg-success px-3 py-2 text-xs font-semibold text-white hover:bg-success/80"
            >
              {t('CONFIRM')}
            </button>
            <button
              type="button"
              onClick={onDecline}
              className="rounded-2xl bg-danger px-3 py-2 text-xs font-semibold text-white hover:bg-danger/80"
            >
              {t('DECLINE')}
            </button>
          </div>
        )}
        {pendingCard && (
          <button
            type="button"
            onClick={onResolve}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-soft hover:bg-slate-700"
          >
            {t('RESOLVE_CARD')}
          </button>
        )}
      </div>
      <p className="mt-4 text-xs text-slate-500" aria-live="polite">
        {turnPhase === 'purchase' && t('PHASE_PURCHASE')}
        {turnPhase === 'card' && t('PHASE_CARD')}
        {turnPhase === 'idle' && t('PHASE_IDLE')}
      </p>
    </section>
  );
}
