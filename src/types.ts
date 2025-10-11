import type { WorldGrid } from './world/terrain';

export type { WorldGrid, Tile } from './world/terrain';
export { TerrainType } from './world/terrain';

export type Position = { x: number; y: number };

export type Player = {
  id: number;
  color: number;
};

export type GameState = {
  worldGenerated: boolean;
  mapWidth: number;
  mapHeight: number;
  players: Player[];
  world: WorldGrid | null;
};
