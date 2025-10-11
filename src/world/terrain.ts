export enum TerrainType {
  Water = 'water',
  Grass = 'grass',
  Forest = 'forest',
  Mountain = 'mountain',
}

export const TERRAIN_INFO = {
  [TerrainType.Water]: { color: 0x3498db, name: 'Water' },
  [TerrainType.Grass]: { color: 0x2ecc71, name: 'Grass' },
  [TerrainType.Forest]: { color: 0x27ae60, name: 'Forest' },
  [TerrainType.Mountain]: { color: 0x95a5a6, name: 'Mountain' },
} as const;

export type Tile = {
  terrainType: TerrainType;
  elevation: number;
};

export type WorldGrid = Tile[][];
