import { TerrainType, type WorldGrid } from './terrain';
import { ELEVATION_THRESHOLDS } from '../constants';
import type { Position } from '../types';
import { Faction } from '../faction/Faction';
import { Farm, Barracks, ArcheryRange, Monastery } from '../buildings/buildingTypes';

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

//interpolation for perlin noise

function smoothInterp(t: number, a: number, b: number): number {
  const smoothT = 6 * t ** 5 - 15 * t ** 4 + 10 * t ** 3;
  return (1 - smoothT) * a + smoothT * b;
}

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

/**
 * Select a random building type based on terrain.
 */
function selectBuildingType(terrainType: TerrainType): 'barracks' | 'archery_range' | 'monastery' {
  const roll = Math.random() * 100;

  switch (terrainType) {
    case TerrainType.Grass:
      // 50% Barracks, 25% Archery Range, 25% Monastery
      if (roll < 50) return 'barracks';
      if (roll < 75) return 'archery_range';
      return 'monastery';

    case TerrainType.Forest:
      // 50% Archery Range, 25% Barracks, 25% Monastery
      if (roll < 50) return 'archery_range';
      if (roll < 75) return 'barracks';
      return 'monastery';

    case TerrainType.Mountain:
      // 50% Monastery, 25% Barracks, 25% Archery Range
      if (roll < 50) return 'monastery';
      if (roll < 75) return 'barracks';
      return 'archery_range';

    default:
      // Water or unknown - default to random
      const types: ('barracks' | 'archery_range' | 'monastery')[] = ['barracks', 'archery_range', 'monastery'];
      return types[Math.floor(Math.random() * types.length)];
  }
}

// Generate neutral buildings across the map
export function generateSettlements(world: WorldGrid, playerPositions: Position[], targetCount: number = 45, neutralFaction: Faction): void {
  const height = world.length;
  const width = world[0].length;
  const buildings: Position[] = [];
  const minDistance = 3;
  const buildingsPerPlayer = 6; // Guaranteed buildings near each player
  const playerBuildingMinRadius = 8;
  const playerBuildingMaxRadius = 15;

  // Helper to check distance from all existing buildings and player positions
  const isTooClose = (row: number, col: number): boolean => {
    // Check against buildings
    for (const building of buildings) {
      const distance = Math.sqrt((row - building.y) ** 2 + (col - building.x) ** 2);
      if (distance < minDistance) return true;
    }

    // Check against player starting positions
    for (const pos of playerPositions) {
      const distance = Math.sqrt((row - pos.y) ** 2 + (col - pos.x) ** 2);
      if (distance < minDistance) return true;
    }

    return false;
  };

  // First, place guaranteed buildings near each player capital (no distance check, create islands if needed)
  for (const playerPos of playerPositions) {
    let placedForPlayer = 0;
    let attempts = 0;
    const maxAttemptsPerPlayer = buildingsPerPlayer * 20;
    let farmPlaced = false;

    while (placedForPlayer < buildingsPerPlayer && attempts < maxAttemptsPerPlayer) {
      attempts++;

      // Generate random position in ring around player capital
      const angle = Math.random() * Math.PI * 2;
      const distance = playerBuildingMinRadius + Math.random() * (playerBuildingMaxRadius - playerBuildingMinRadius);

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

      const pos = { x: col, y: row };

      // First building for this player is always a farm
      if (!farmPlaced) {
        const farm = new Farm(neutralFaction, pos);
        world[row][col].building = farm;
        neutralFaction.addBuilding(farm);
        farmPlaced = true;
      } else {
        // Other buildings based on terrain
        const buildingType = selectBuildingType(world[row][col].terrainType);
        let building;
        if (buildingType === 'barracks') {
          building = new Barracks(neutralFaction, pos);
        } else if (buildingType === 'archery_range') {
          building = new ArcheryRange(neutralFaction, pos);
        } else {
          building = new Monastery(neutralFaction, pos);
        }
        world[row][col].building = building;
        neutralFaction.addBuilding(building);
      }

      buildings.push(pos);
      placedForPlayer++;
    }
  }

  // Second, place remaining buildings randomly (must respect distance checks)
  let attempts = 0;
  const maxAttempts = targetCount * 10;

  while (buildings.length < targetCount && attempts < maxAttempts) {
    attempts++;

    const row = Math.floor(Math.random() * height);
    const col = Math.floor(Math.random() * width);
    const tile = world[row][col];

    // Check if tile is land and doesn't already have a building
    if (tile.terrainType === TerrainType.Water || tile.building) {
      continue;
    }

    // Check if too close to other buildings or players
    if (isTooClose(row, col)) {
      continue;
    }

    const pos = { x: col, y: row };

    // Select building type based on terrain
    const buildingType = selectBuildingType(tile.terrainType);
    let building;
    if (buildingType === 'barracks') {
      building = new Barracks(neutralFaction, pos);
    } else if (buildingType === 'archery_range') {
      building = new ArcheryRange(neutralFaction, pos);
    } else {
      building = new Monastery(neutralFaction, pos);
    }

    world[row][col].building = building;
    neutralFaction.addBuilding(building);

    buildings.push(pos);
  }
}
