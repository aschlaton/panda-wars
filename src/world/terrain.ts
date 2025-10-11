export enum TerrainType {
  Water = 'water',
  Grass = 'grass',
  Forest = 'forest',
  Mountain = 'mountain',
}

export const TERRAIN_INFO = {
  [TerrainType.Water]: { color: 0x3498db, name: 'Water', movementCost: 2 },
  [TerrainType.Grass]: { color: 0x2ecc71, name: 'Grass', movementCost: 1 },
  [TerrainType.Forest]: { color: 0x27ae60, name: 'Forest', movementCost: 1 },
  [TerrainType.Mountain]: { color: 0x95a5a6, name: 'Mountain', movementCost: 2 },
} as const;

import type { Unit } from '../units/Unit';
import type { Building } from '../buildings/Building';

export type Tile = {
  terrainType: TerrainType;
  elevation: number;
  building?: Building;
  unit?: Unit;
};

export type WorldGrid = Tile[][];
