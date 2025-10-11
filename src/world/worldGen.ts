import { TerrainType, type WorldGrid } from './terrain';
import { ELEVATION_THRESHOLDS } from '../constants';
import type { Position } from '../types';
import { Faction } from '../faction/Faction';
import { Settlement } from '../buildings/buildingTypes';

// Generate random 2D gradient vector
function generateGradient(): [number, number] {
  const angle = Math.random() * 2 * Math.PI;
  return [Math.cos(angle), Math.sin(angle)];
}

// Generate gradient vectors for each corner of the grid
function generateCornerGradients(l: number): [number, number][][] {
  const gradients: [number, number][][] = [];
  for (let i = 0; i <= l; i++) {
    gradients[i] = [];
    for (let j = 0; j <= l; j++) {
      gradients[i][j] = generateGradient();
    }
  }
  return gradients;
}

// Compute dot products between gradients and distance vectors
function computeDotProducts(
  gradients: [number, number][][],
  x: number,
  y: number
): number[][] {
  const maxX = gradients[0].length - 1;
  const maxY = gradients.length - 1;

  const floorX = Math.min(Math.floor(x), maxX - 1);
  const floorY = Math.min(Math.floor(y), maxY - 1);
  const ceilX = floorX + 1;
  const ceilY = floorY + 1;

  const dots: number[][] = [
    [0, 0],
    [0, 0],
  ];

  const corners = [
    [floorX, floorY],
    [ceilX, floorY],
    [floorX, ceilY],
    [ceilX, ceilY],
  ];

  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      const corner = corners[i * 2 + j];
      const gradient = gradients[corner[1]][corner[0]];
      const delta = [x - corner[0], y - corner[1]];
      dots[i][j] = gradient[0] * delta[0] + gradient[1] * delta[1];
    }
  }

  return dots;
}

// Smooth interpolation using smoothstep function
function smoothInterp(t: number, a: number, b: number): number {
  const smoothT = 6 * t ** 5 - 15 * t ** 4 + 10 * t ** 3;
  return (1 - smoothT) * a + smoothT * b;
}

// Bilinear interpolation of dot products
function interpolate(dots: number[][], x: number, y: number): number {
  const dx = x - Math.floor(x);
  const dy = y - Math.floor(y);

  const interp1 = smoothInterp(dx, dots[0][0], dots[0][1]);
  const interp2 = smoothInterp(dx, dots[1][0], dots[1][1]);
  return smoothInterp(dy, interp1, interp2);
}

// Generate Perlin noise using multiple octaves for natural terrain
export function generatePerlinNoise(size: number, octaves: number = 4): number[][] {
  const grid: number[][] = Array(size)
    .fill(0)
    .map(() => Array(size).fill(0));

  let amplitude = 1;
  let maxValue = 0;

  for (let octave = 0; octave < octaves; octave++) {
    const frequency = 2 ** octave;
    const gridSize = frequency + 1;
    const grad = generateCornerGradients(gridSize);

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const x = (i / size) * frequency;
        const y = (j / size) * frequency;

        const dots = computeDotProducts(grad, x, y);
        const val = interpolate(dots, x, y);

        grid[i][j] += val * amplitude;
      }
    }

    maxValue += amplitude;
    amplitude *= 0.5;
  }

  // Normalize to 0-1
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      grid[i][j] = (grid[i][j] / maxValue + 1) / 2;
    }
  }

  return grid;
}

// Map elevation value to terrain type
function elevationToTerrain(elevation: number): TerrainType {
  if (elevation < ELEVATION_THRESHOLDS.WATER) return TerrainType.Water;
  if (elevation < ELEVATION_THRESHOLDS.GRASS) return TerrainType.Grass;
  if (elevation < ELEVATION_THRESHOLDS.FOREST) return TerrainType.Forest;
  return TerrainType.Mountain;
}

// Generate complete world grid with terrain types and elevations
export function generateWorld(width: number = 150, height: number = 80, octaves: number = 5): WorldGrid {
  // Generate noise at the larger dimension for consistency
  const maxSize = Math.max(width, height);
  const elevations = generatePerlinNoise(maxSize, octaves);
  const world: WorldGrid = [];

  // Find actual min/max to stretch range
  let min = 1, max = 0;
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      min = Math.min(min, elevations[i][j]);
      max = Math.max(max, elevations[i][j]);
    }
  }

  // Stretch to full 0-1 range
  for (let i = 0; i < height; i++) {
    world[i] = [];
    for (let j = 0; j < width; j++) {
      const normalized = (elevations[i][j] - min) / (max - min);

      world[i][j] = {
        elevation: normalized,
        terrainType: elevationToTerrain(normalized),
      };
    }
  }

  return world;
}

// Create a small island at the given position
function createIsland(world: WorldGrid, centerRow: number, centerCol: number, radius: number = 3): void {
  const width = world[0].length;
  const height = world.length;

  // Randomize island characteristics
  const baseElevation = ELEVATION_THRESHOLDS.GRASS + Math.random() * 0.2; // Wider range
  const elevationVariation = Math.random() * 0.3 + 0.15; // More height variation

  // Random shape distortion using multiple angles
  const shapeAngles: number[] = [];
  const shapeDistortions: number[] = [];
  for (let i = 0; i < 8; i++) {
    shapeAngles.push((Math.PI * 2 * i) / 8);
    shapeDistortions.push(0.6 + Math.random() * 0.8); // Random radius multiplier per direction
  }

  for (let row = Math.max(0, centerRow - radius - 1); row <= Math.min(height - 1, centerRow + radius + 1); row++) {
    for (let col = Math.max(0, centerCol - radius - 1); col <= Math.min(width - 1, centerCol + radius + 1); col++) {
      const dx = col - centerCol;
      const dy = row - centerRow;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      // Find nearest angle index for shape distortion
      const angleIndex = Math.floor(((angle + Math.PI) / (Math.PI * 2)) * 8) % 8;
      const nextIndex = (angleIndex + 1) % 8;

      // Interpolate between two nearest distortion values
      const t = (((angle + Math.PI) / (Math.PI * 2)) * 8) % 1;
      const distortionFactor = shapeDistortions[angleIndex] * (1 - t) + shapeDistortions[nextIndex] * t;

      const effectiveRadius = radius * distortionFactor;

      if (distance <= effectiveRadius) {
        // Create island with varying elevation based on distance from center
        const elevationFactor = 1 - (distance / effectiveRadius);

        // Add Perlin-like noise for more natural variation
        const noise1 = Math.sin(row * 0.5 + col * 0.3) * 0.1;
        const noise2 = Math.cos(row * 0.3 - col * 0.5) * 0.08;
        const randomNoise = (Math.random() - 0.5) * 0.12;

        const elevation = baseElevation + elevationFactor * elevationVariation + noise1 + noise2 + randomNoise;

        world[row][col] = {
          elevation: Math.min(Math.max(elevation, ELEVATION_THRESHOLDS.GRASS), 0.95),
          terrainType: elevationToTerrain(elevation),
        };
      }
    }
  }
}

// Generate starting positions for players near the 4 corners
export function generateStartingPositions(world: WorldGrid, numPlayers: number = 4): Position[] {
  const height = world.length;
  const width = world[0].length;
  const positions: Position[] = [];

  // Define corner base positions with randomization
  const cornerBases = [
    { rowBase: 0.15, colBase: 0.15 }, // Top-left
    { rowBase: 0.15, colBase: 0.85 }, // Top-right
    { rowBase: 0.85, colBase: 0.15 }, // Bottom-left
    { rowBase: 0.85, colBase: 0.85 }, // Bottom-right
  ];

  for (let i = 0; i < Math.min(numPlayers, 4); i++) {
    const { rowBase, colBase } = cornerBases[i];

    // Add random offset within ±5% of map size
    const rowOffset = (Math.random() - 0.5) * 0.1 * height;
    const colOffset = (Math.random() - 0.5) * 0.1 * width;

    const row = Math.floor(height * rowBase + rowOffset);
    const col = Math.floor(width * colBase + colOffset);

    // Check if position is on water and create island if needed
    if (world[row][col].terrainType === TerrainType.Water) {
      createIsland(world, row, col, 4);
    }

    positions.push({ x: col, y: row });
  }

  return positions;
}

// Generate neutral settlements across the map
export function generateSettlements(world: WorldGrid, playerPositions: Position[], targetCount: number = 45): void {
  const height = world.length;
  const width = world[0].length;
  const settlements: Position[] = [];
  const minDistance = 3;
  const settlementsPerPlayer = 6; // Guaranteed settlements near each player
  const playerSettlementMinRadius = 8;
  const playerSettlementMaxRadius = 15;

  // Create neutral faction for settlements
  const neutralFaction = new Faction(-1, 0x808080, { x: 0, y: 0 });

  // Helper to check distance from all existing settlements and player positions
  const isTooClose = (row: number, col: number): boolean => {
    // Check against settlements
    for (const settlement of settlements) {
      const distance = Math.sqrt((row - settlement.y) ** 2 + (col - settlement.x) ** 2);
      if (distance < minDistance) return true;
    }

    // Check against player starting positions
    for (const pos of playerPositions) {
      const distance = Math.sqrt((row - pos.y) ** 2 + (col - pos.x) ** 2);
      if (distance < minDistance) return true;
    }

    return false;
  };

  // First, place guaranteed settlements near each player capital (no distance check, create islands if needed)
  for (const playerPos of playerPositions) {
    let placedForPlayer = 0;
    let attempts = 0;
    const maxAttemptsPerPlayer = settlementsPerPlayer * 20;

    while (placedForPlayer < settlementsPerPlayer && attempts < maxAttemptsPerPlayer) {
      attempts++;

      // Generate random position in ring around player capital
      const angle = Math.random() * Math.PI * 2;
      const distance = playerSettlementMinRadius + Math.random() * (playerSettlementMaxRadius - playerSettlementMinRadius);

      const row = Math.round(playerPos.y + distance * Math.sin(angle));
      const col = Math.round(playerPos.x + distance * Math.cos(angle));

      // Check bounds
      if (row < 0 || row >= height || col < 0 || col >= width) {
        continue;
      }

      const tile = world[row][col];

      // Check if already has a building
      if (tile.building) {
        continue;
      }

      // If water, create an island
      if (tile.terrainType === TerrainType.Water) {
        createIsland(world, row, col, 3);
      }

      // Place settlement
      const pos = { x: col, y: row };
      const settlement = new Settlement(neutralFaction, pos);
      world[row][col].building = settlement;
      neutralFaction.addBuilding(settlement);

      settlements.push(pos);
      placedForPlayer++;
    }
  }

  // Second, place remaining settlements randomly (must respect distance checks)
  let attempts = 0;
  const maxAttempts = targetCount * 10;

  while (settlements.length < targetCount && attempts < maxAttempts) {
    attempts++;

    const row = Math.floor(Math.random() * height);
    const col = Math.floor(Math.random() * width);
    const tile = world[row][col];

    // Check if tile is land (not water) and doesn't already have a building
    if (tile.terrainType === TerrainType.Water || tile.building) {
      continue;
    }

    // Check if too close to other settlements or players
    if (isTooClose(row, col)) {
      continue;
    }

    // Place settlement
    const pos = { x: col, y: row };
    const settlement = new Settlement(neutralFaction, pos);
    tile.building = settlement;
    neutralFaction.addBuilding(settlement);

    settlements.push(pos);
  }
}
