interface WarningsBannerProps {
  warnings: string[];
}

export function WarningsBanner({ warnings }: WarningsBannerProps) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="assertive"
      className="rounded-3xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
    >
      <h2 className="text-sm font-semibold">Предупреждения загрузки</h2>
      <ul className="list-disc pl-5">
        {warnings.map((warning, index) => (
          <li key={`${warning}-${index}`}>{warning}</li>
        ))}
      </ul>
    </div>
  );
}
