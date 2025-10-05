interface LogPanelProps {
  log: string[];
  t: (key: string) => string;
}

export function LogPanel({ log, t }: LogPanelProps) {
  return (
    <section
      className="rounded-3xl bg-surface p-4 shadow-soft"
      aria-labelledby="log-heading"
    >
      <header className="mb-3 flex items-center justify-between">
        <h2 id="log-heading" className="text-lg font-semibold text-slate-700">
          {t('LOG_HEADING')}
        </h2>
        <span className="text-xs text-slate-500">{log.length} {t('LOG_ENTRIES')}</span>
      </header>
      <ol className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-2 text-sm text-slate-600" tabIndex={0}>
        {log.slice().reverse().map((entry, index) => (
          <li
            key={`${entry}-${index}`}
            className="rounded-2xl bg-slate-100 px-3 py-2"
          >
            {entry}
          </li>
        ))}
      </ol>
    </section>
  );
}
