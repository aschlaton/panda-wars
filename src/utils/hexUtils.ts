import type { Position } from '../types';

/**
 * Get the 6 neighboring hexagon positions for a pointy-top hex grid with odd-row offset.
 * In this coordinate system, odd rows are offset to the right by half a hex width.
 */
export function getHexNeighbors(pos: Position, mapWidth: number, mapHeight: number): Position[] {
  const { x: col, y: row } = pos;
  const neighbors: Position[] = [];

  // For pointy-top hexagons with odd-row offset:
  // Even rows: neighbors have standard offsets
  // Odd rows: neighbors are shifted due to offset

  const isOddRow = row % 2 === 1;

  const offsets = isOddRow
    ? [
        { dx: 0, dy: -1 },  // Top
        { dx: 1, dy: -1 },  // Top-right
        { dx: 1, dy: 0 },   // Bottom-right
        { dx: 0, dy: 1 },   // Bottom
        { dx: -1, dy: 0 },  // Bottom-left
        { dx: -1, dy: -1 }, // Top-left
      ]
    : [
        { dx: 0, dy: -1 },  // Top
        { dx: 1, dy: 0 },   // Top-right
        { dx: 1, dy: 1 },   // Bottom-right
        { dx: 0, dy: 1 },   // Bottom
        { dx: -1, dy: 1 },  // Bottom-left
        { dx: -1, dy: 0 },  // Top-left
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
