import type { Unit } from '../units/Unit';
import type { WorldGrid, Tile } from '../world/terrain';
import type { Position } from '../types';
import type { Faction } from '../faction/Faction';
import { TerrainType } from '../world/terrain';
import { getHexNeighbors } from '../utils/hexUtils';

export abstract class Building {
  public type: string;
  public faction: Faction;
  public position: Position;
  public defenseMultiplier: number;
  public productionInterval: number | null; // null means no production
  public productionTicker: number;

  constructor(type: string, faction: Faction, position: Position, defenseMultiplier: number, productionInterval: number | null, initialTicker: number) {
    this.type = type;
    this.faction = faction;
    this.position = position;
    this.defenseMultiplier = defenseMultiplier;
    this.productionInterval = productionInterval;
    this.productionTicker = initialTicker;
  }

  // Override this method in subclasses to define what troops to produce
  // Returns { troop, spawnPos } if successful, null otherwise
  protected abstract generateTroop(world: WorldGrid, position: Position, faction: Faction): { troop: Unit; spawnPos: Position } | null;

  // Attempt to produce a troop
  public processTurn(world: WorldGrid): Unit | null {
    if (this.productionInterval === null) return null;

    // Decrement ticker
    if (this.productionTicker > 0) {
      this.productionTicker--;
      return null;
    }

    // Try to spawn troop
    const result = this.generateTroop(world, this.position, this.faction);

    if (result) {
      const { troop } = result;
      // Successfully spawned, add to faction and reset ticker
      this.faction.addUnit(troop);
      this.productionTicker = this.productionInterval;
      return troop;
    } else {
      // Failed to spawn, keep ticker at 1 to try again next turn
      this.productionTicker = 1;
      return null;
    }
  }

  // Find a valid spawn position (building tile first, then neighbors)
  protected findSpawnPosition(world: WorldGrid, position: Position, mapWidth: number, mapHeight: number): Position | null {
    const buildingTile = world[position.y][position.x];
    if (this.isValidSpawnTile(buildingTile)) {
      return position;
    }

    const neighbors = getHexNeighbors(position, mapWidth, mapHeight);
    for (const neighbor of neighbors) {
      const tile = world[neighbor.y][neighbor.x];
      if (this.isValidSpawnTile(tile)) {
        return neighbor;
      }
    }

    return null;
  }

  // Check if a tile is valid for spawning a unit
  protected isValidSpawnTile(tile: Tile): boolean {
    // Can't spawn on water
    if (tile.terrainType === TerrainType.Water) return false;

    // Can't spawn if there's already a unit
    if (tile.unit) return false;

    // Can't spawn on enemy building
    if (tile.building && tile.building.faction !== this.faction) return false;

    return true;
  }

  // Place a troop on the world grid and randomize next production interval
  protected placeTroop(troop: Unit, world: WorldGrid, position: Position): void {
    world[position.y][position.x].unit = troop;

    // Units spawn with 0 movement points (can't move on spawn turn)
    troop.movementPoints = 0;

    // Randomly set next production interval to 3, 4, or 5
    this.productionInterval = Math.floor(Math.random() * 3) + 3;
  }
}
