import type { Position } from '../types';
import * as PIXI from 'pixi.js';

export function drawHexagon(graphics: PIXI.Graphics, x: number, y: number, size: number): void {
  const points: number[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i + Math.PI / 6;
    points.push(x + size * Math.cos(angle));
    points.push(y + size * Math.sin(angle));
  }
  graphics.poly(points);
}

export function screenToHexCoords(
  screenX: number,
  screenY: number,
  worldContainerX: number,
  worldContainerY: number,
  zoomLevel: number,
  hexRadius: number,
  hexWidth: number,
  mapWidth: number,
  mapHeight: number
): { col: number; row: number } | null {
  const worldX = (screenX - worldContainerX) / zoomLevel;
  const worldY = (screenY - worldContainerY) / zoomLevel;

  const row = Math.round((worldY - hexRadius) / (hexRadius * 1.5));
  const col = Math.round((worldX - hexWidth / 2 - (row % 2) * (hexWidth / 2)) / hexWidth);

  if (col < 0 || col >= mapWidth || row < 0 || row >= mapHeight) {
    return null;
  }

  return { col, row };
}

export function getHexNeighbors(pos: Position, mapWidth: number, mapHeight: number): Position[] {
  const { x: col, y: row } = pos;
  const neighbors: Position[] = [];


  const isOddRow = row % 2 === 1;

  // Even rows (0, 2, 4...): diagonal neighbors at col±1
  // Odd rows (1, 3, 5...): NE/SE at col+1, NW/SW at same col
  const offsets = isOddRow
    ? [
        { dx: 1, dy: -1 },  // NE (Northeast)
        { dx: 1, dy: 0 },   // E (East)
        { dx: 1, dy: 1 },   // SE (Southeast)
        { dx: 0, dy: 1 },   // SW (Southwest) - same col for odd rows
        { dx: -1, dy: 0 },  // W (West)
        { dx: 0, dy: -1 },  // NW (Northwest) - same col for odd rows
      ]
    : [
        { dx: 0, dy: -1 },  // NE (Northeast) - same col for even rows
        { dx: 1, dy: 0 },   // E (East)
        { dx: 0, dy: 1 },   // SE (Southeast) - same col for even rows
        { dx: -1, dy: 1 },  // SW (Southwest)
        { dx: -1, dy: 0 },  // W (West)
        { dx: -1, dy: -1 }, // NW (Northwest)
      ];

  for (const { dx, dy } of offsets) {
    const newCol = col + dx;
    const newRow = row + dy;

    // Check bounds
    if (newCol >= 0 && newCol < mapWidth && newRow >= 0 && newRow < mapHeight) {
      neighbors.push({ x: newCol, y: newRow });
    }
  }

  return neighbors;
}

/**
 * Get all positions within a given radius (including the center position).
 */
export function hexToPixel(col: number, row: number, hexRadius: number, hexWidth: number): { x: number; y: number } {
  const x = col * hexWidth + (row % 2) * (hexWidth / 2) + hexWidth / 2;
  const y = row * (hexRadius * 1.5) + hexRadius;
  return { x, y };
}

export function getHexRadius(center: Position, radius: number, mapWidth: number, mapHeight: number): Position[] {
  if (radius === 0) return [center];

  const positions: Position[] = [center];
  const visited = new Set<string>([`${center.x},${center.y}`]);

  let currentLayer = [center];

  for (let r = 0; r < radius; r++) {
    const nextLayer: Position[] = [];

    for (const pos of currentLayer) {
      const neighbors = getHexNeighbors(pos, mapWidth, mapHeight);

      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`;
        if (!visited.has(key)) {
          visited.add(key);
          positions.push(neighbor);
          nextLayer.push(neighbor);
        }
      }
    }

    currentLayer = nextLayer;
  }

  return positions;
}
