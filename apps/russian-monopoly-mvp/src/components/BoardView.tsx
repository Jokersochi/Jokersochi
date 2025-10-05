import type { BoardCell } from '../config/types';
import type { PlayerState } from '../store/gameStore';

interface BoardViewProps {
  board: BoardCell[];
  players: PlayerState[];
  activeCellId?: string;
  currentPlayerId?: string;
}

const typeLabels: Partial<Record<BoardCell['type'], string>> = {
  start: 'Старт',
  property: 'Собственность',
  transport: 'Транспорт',
  utility: 'Инфраструктура',
  tax: 'Налог',
  chance: 'Шанс',
  trial: 'Испытание',
  'micro-event': 'Микро-ивент',
  contract: 'Контракт',
  'goto-jail': 'Следственный комитет',
  jail: 'Тюрьма',
  parking: 'Стоянка'
};

const formatRent = (cell: BoardCell): string | null => {
  if (!cell.rent) {
    return null;
  }

  if (typeof cell.rent === 'number') {
    return `${cell.rent}₽`;
  }

  if (typeof cell.rent.fixed === 'number') {
    return `${cell.rent.fixed}₽`;
  }

  if (typeof cell.rent.base === 'number') {
    return `${cell.rent.base}₽`;
  }

  if (typeof cell.rent.multiplier === 'number' && typeof cell.price === 'number') {
    return `${Math.round(cell.price * cell.rent.multiplier)}₽`;
  }

  return null;
};

const formatTax = (cell: BoardCell): string | null => {
  if (typeof cell.tax === 'number') {
    return `${cell.tax}₽`;
  }

  if (typeof cell.amount === 'number') {
    return `${cell.amount}₽`;
  }

  return null;
};

export function BoardView({ board, players, activeCellId, currentPlayerId }: BoardViewProps) {
  return (
    <section className="flex-1 rounded-3xl bg-surface p-4 shadow-soft" aria-labelledby="board-heading">
      <div className="mb-4 flex items-center justify-between">
        <h2 id="board-heading" className="text-lg font-semibold text-slate-700">
          Поле
        </h2>
        <span className="text-xs text-slate-500">{board.length} клеток</span>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        {board.map((cell, index) => {
          const occupants = players.filter((player) => player.position === index);
          const isActive = cell.id === activeCellId;
          const isCurrentPlayerOnCell = occupants.some((player) => player.id === currentPlayerId);
          const rentLabel = formatRent(cell);
          const taxLabel = formatTax(cell);
          const typeLabel = typeLabels[cell.type] ?? cell.type;

          return (
            <article
              key={cell.id}
              className={`flex flex-col gap-2 rounded-2xl border p-3 transition ${
                isActive
                  ? 'border-accent bg-accent/10'
                  : isCurrentPlayerOnCell
                    ? 'border-success bg-success/10'
                    : 'border-slate-200 bg-white'
              }`}
              aria-label={`${cell.name}. Тип: ${typeLabel}`}
            >
              <header className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">{cell.name}</h3>
                  {cell.category && (
                    <p className="text-[11px] text-slate-400">{cell.category}</p>
                  )}
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
                  {typeLabel}
                </span>
              </header>
              {typeof cell.price === 'number' && cell.price > 0 && (
                <p className="text-xs text-slate-500">Стоимость: {cell.price}₽</p>
              )}
              {rentLabel && <p className="text-xs text-slate-500">Аренда: {rentLabel}</p>}
              {taxLabel && <p className="text-xs text-slate-500">Налог: {taxLabel}</p>}
              {cell.description && <p className="text-xs text-slate-500">{cell.description}</p>}
              {occupants.length > 0 && (
                <ul className="mt-auto flex flex-wrap gap-1" aria-label="Игроки на клетке">
                  {occupants.map((player) => (
                    <li
                      key={player.id}
                      className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                    >
                      <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-accent" />
                      {player.name}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
