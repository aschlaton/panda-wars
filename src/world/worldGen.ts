import { TerrainType, type WorldGrid } from './terrain';
import { ELEVATION_THRESHOLDS } from '../constants';

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
