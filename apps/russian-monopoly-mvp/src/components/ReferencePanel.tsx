import type { Contract, MicroEvent } from '../config/types';

interface ReferencePanelProps {
  microEvents: MicroEvent[];
  contracts: Contract[];
  t: (key: string) => string;
}

export function ReferencePanel({ microEvents, contracts, t }: ReferencePanelProps) {
  return (
    <section className="rounded-3xl bg-surface p-4 shadow-soft" aria-labelledby="reference-heading">
      <h2 id="reference-heading" className="mb-3 text-lg font-semibold text-slate-700">
        {t('REFERENCE_HEADING')}
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-600">{t('MICRO_EVENTS_HEADING')}</h3>
          <ul className="mt-2 flex flex-col gap-2 text-xs text-slate-600">
            {microEvents.map((event) => (
              <li key={event.id} className="rounded-2xl bg-slate-100 p-3">
                <p className="font-semibold text-slate-700">{event.name}</p>
                <p>{t('TRIGGER_LABEL')}: {event.trigger}</p>
                {event.effect.money && <p>{t('EFFECT_MONEY')}: {event.effect.money}₽</p>}
                {event.effect.move && <p>{t('EFFECT_MOVE')}: {event.effect.move}</p>}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-600">{t('CONTRACTS_HEADING')}</h3>
          <ul className="mt-2 flex flex-col gap-2 text-xs text-slate-600">
            {contracts.map((contract) => (
              <li key={contract.id} className="rounded-2xl bg-slate-100 p-3">
                <p className="font-semibold text-slate-700">{contract.name}</p>
                <p>{contract.description}</p>
                <p>{t('REWARD_LABEL')}: {contract.reward}₽</p>
                <p>{t('UPKEEP_LABEL')}: {contract.upkeep}₽</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
