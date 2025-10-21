import { boardTrack, BoardCell } from '@/utils/board';

export interface PositionedCell extends BoardCell {
  x: number;
  y: number;
  width: number;
  height: number;
}

const widthSegments = 15;
const heightSegments = 9;
const tileSize = 64;

export const getBoardLayout = (): PositionedCell[] => {
  const positioned: PositionedCell[] = [];
  let index = 0;

  const pushCell = (cell: BoardCell, col: number, row: number) => {
    positioned.push({ ...cell, x: col * tileSize, y: row * tileSize, width: tileSize, height: tileSize });
  };

  // Top edge left -> right
  for (let col = 0; col < widthSegments && index < boardTrack.length; col += 1, index += 1) {
    pushCell(boardTrack[index], col, 0);
  }
  // Right edge top+1 -> bottom
  for (let row = 1; row < heightSegments && index < boardTrack.length; row += 1, index += 1) {
    pushCell(boardTrack[index], widthSegments - 1, row);
  }
  // Bottom edge right-1 -> left
  for (let col = widthSegments - 2; col >= 0 && index < boardTrack.length; col -= 1, index += 1) {
    pushCell(boardTrack[index], col, heightSegments - 1);
  }
  // Left edge bottom-1 -> top+1
  for (let row = heightSegments - 2; row > 0 && index < boardTrack.length; row -= 1, index += 1) {
    pushCell(boardTrack[index], 0, row);
  }

  return positioned;
};

export const boardDimensions = {
  width: widthSegments * tileSize,
  height: heightSegments * tileSize,
};
