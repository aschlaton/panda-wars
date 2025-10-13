import type { WorldGrid } from './world/terrain';
import type { Faction } from './faction/Faction';
import type { Army } from './armies/Army';

export type { WorldGrid, Tile } from './world/terrain';
export { TerrainType } from './world/terrain';

export type Position = { x: number; y: number };

export type GameState = {
  worldGenerated: boolean;
  mapWidth: number;
  mapHeight: number;
  factions: Faction[];
  world: WorldGrid | null;
  armies: Army[];
  minimapNeedsUpdate?: boolean;
  allBuildings?: import('./buildings/Building').Building[]; // Global cache of all buildings
};
