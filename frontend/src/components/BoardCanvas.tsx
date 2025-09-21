import { FC, useMemo } from 'react';
import { Stage, Container, Graphics, Text } from '@pixi/react';
import { boardDimensions, getBoardLayout, PositionedCell } from '@/canvas/boardRenderer';
import type { Graphics as PixiGraphics } from 'pixi.js';
import { palette } from '@/theme/palette';
import { MatchViewState } from '@/store/useGameStore';

const cellColors: Record<string, number> = {
  brand: 0x1d4ed8,
  event: 0x9333ea,
  infrastructure: 0x0ea5e9,
  special: 0xf59e0b,
  auction: 0x3f6212,
  contract: 0x14b8a6,
};

const playerColors = [0xf87171, 0x34d399, 0x60a5fa, 0xfbbf24, 0xc084fc, 0x4ade80];

interface BoardCanvasProps {
  match: MatchViewState;
}

const drawCell = (graphics: PixiGraphics, cell: PositionedCell) => {
  graphics.clear();
  const fill = cellColors[cell.type] ?? 0x1e293b;
  graphics.beginFill(fill, 0.85);
  graphics.drawRoundedRect(cell.x, cell.y, cell.width, cell.height, 8);
  graphics.endFill();
  graphics.lineStyle(2, 0x0f172a, 0.9);
  graphics.drawRoundedRect(cell.x, cell.y, cell.width, cell.height, 8);
};

export const BoardCanvas: FC<BoardCanvasProps> = ({ match }) => {
  const layout = useMemo(() => getBoardLayout(), []);
  const layoutMap = useMemo(() => {
    const entries: Record<string, PositionedCell> = {};
    layout.forEach((cell) => {
      entries[cell.id] = cell;
    });
    return entries;
  }, [layout]);

  const width = boardDimensions.width + 64;
  const height = boardDimensions.height + 64;

  return (
    <Stage width={width} height={height} options={{ background: 0x0f172a, antialias: true }}>
      <Container x={32} y={32}>
        {layout.map((cell) => (
          <Graphics key={cell.id} draw={(g) => drawCell(g, cell)} />
        ))}
        {layout.map((cell) => (
          <Text
            key={`${cell.id}-label`}
            text={cell.label}
            x={cell.x + 6}
            y={cell.y + 6}
            style={{ fill: palette.text, fontSize: 12, wordWrap: true, wordWrapWidth: cell.width - 12 }}
            accessibleTitle={cell.label}
          />
        ))}
        {match.players.map((player, index) => {
          const cell = layout[player.position % layout.length];
          const target = layoutMap[cell.id] ?? layout[0];
          return (
            <Graphics
              key={`token-${player.id}`}
              draw={(g) => {
                g.clear();
                g.beginFill(playerColors[index % playerColors.length], 0.95);
                g.drawCircle(target.x + target.width / 2, target.y + target.height / 2, 12);
                g.endFill();
              }}
            />
          );
        })}
      </Container>
    </Stage>
  );
};
