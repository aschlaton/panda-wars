import { Building } from './Building';
import type { Unit } from '../units/Unit';
import type { WorldGrid } from '../world/terrain';
import type { Position } from '../types';
import type { Faction } from '../faction/Faction';
import { Warrior, Archer, Monk, Farmer } from '../units/troops';
import { TerrainType } from '../world/terrain';
import { getHexRadius } from '../utils/hexUtils';

export class Capital extends Building {
  constructor(faction: Faction) {
    super('capital', faction, 0.75, 3, 1); // 25% damage reduction, produces every 3 turns, starts at ticker 1 (spawns immediately)
  }

  protected generateTroop(world: WorldGrid, position: Position, faction: Faction): Unit | null {
    const mapWidth = world[0].length;
    const mapHeight = world.length;

    // Calculate troop type probabilities based on surrounding terrain
    const surroundingTiles = getHexRadius(position, 1, mapWidth, mapHeight);

    let grassCount = 0;
    let forestCount = 0;
    let mountainCount = 0;

    for (const pos of surroundingTiles) {
      const tile = world[pos.y][pos.x];
      if (tile.terrainType === TerrainType.Grass) grassCount++;
      else if (tile.terrainType === TerrainType.Forest) forestCount++;
      else if (tile.terrainType === TerrainType.Mountain) mountainCount++;
    }

    // Calculate probabilities (10% base + 10% per matching terrain)
    const warriorChance = 10 + grassCount * 10;
    const archerChance = 10 + forestCount * 10;
    const monkChance = 10 + mountainCount * 10;

    // Random selection based on weighted probabilities
    const total = warriorChance + archerChance + monkChance;
    const roll = Math.random() * total;

    let troopType: 'warrior' | 'archer' | 'monk';
    if (roll < warriorChance) {
      troopType = 'warrior';
    } else if (roll < warriorChance + archerChance) {
      troopType = 'archer';
    } else {
      troopType = 'monk';
    }

    // Try to find valid spawn position
    const spawnPosition = this.findSpawnPosition(world, position, mapWidth, mapHeight);
    if (!spawnPosition) return null;

    // Create and place troop with faction's food score
    const foodScore = faction.calculateFoodScore(world);
    let troop: Unit;
    if (troopType === 'warrior') troop = new Warrior(this.faction, foodScore);
    else if (troopType === 'archer') troop = new Archer(this.faction, foodScore);
    else troop = new Monk(this.faction, foodScore);

    this.placeTroop(troop, world, spawnPosition);
    return troop;
  }

}

export class Settlement extends Building {
  constructor(faction: Faction) {
    super('settlement', faction, 0.85, null, -1); // 15% damage reduction, no production
  }

  protected generateTroop(_world: WorldGrid, _position: Position, _faction: Faction): Unit | null {
    // Settlements don't produce yet
    return null;
  }
}

export class ArcheryRange extends Building {
  constructor(faction: Faction) {
    super('archery_range', faction, 0.85, 3, 3); // 15% damage reduction, starts at 3 turns
  }

  protected generateTroop(world: WorldGrid, position: Position, faction: Faction): Unit | null {
    const mapWidth = world[0].length;
    const mapHeight = world.length;

    const spawnPosition = this.findSpawnPosition(world, position, mapWidth, mapHeight);
    if (!spawnPosition) return null;

    const foodScore = faction.calculateFoodScore(world);
    const troop = new Archer(this.faction, foodScore);
    this.placeTroop(troop, world, spawnPosition);
    return troop;
  }

}

export class Monastery extends Building {
  constructor(faction: Faction) {
    super('monastery', faction, 0.85, 3, 3); // 15% damage reduction, starts at 3 turns
  }

  protected generateTroop(world: WorldGrid, position: Position, faction: Faction): Unit | null {
    const mapWidth = world[0].length;
    const mapHeight = world.length;

    const spawnPosition = this.findSpawnPosition(world, position, mapWidth, mapHeight);
    if (!spawnPosition) return null;

    const foodScore = faction.calculateFoodScore(world);
    const troop = new Monk(this.faction, foodScore);
    this.placeTroop(troop, world, spawnPosition);
    return troop;
  }

}

export class Barracks extends Building {
  constructor(faction: Faction) {
    super('barracks', faction, 0.85, 3, 3); // 15% damage reduction, starts at 3 turns
  }

  protected generateTroop(world: WorldGrid, position: Position, faction: Faction): Unit | null {
    const mapWidth = world[0].length;
    const mapHeight = world.length;

    const spawnPosition = this.findSpawnPosition(world, position, mapWidth, mapHeight);
    if (!spawnPosition) return null;

    const foodScore = faction.calculateFoodScore(world);
    const troop = new Warrior(this.faction, foodScore);
    this.placeTroop(troop, world, spawnPosition);

    return troop;
  }

}

export class Farm extends Building {
  constructor(faction: Faction) {
    super('farm', faction, 1.0, 3, 3); // No defense bonus (1.0x = full damage), starts at 3 turns
  }

  protected generateTroop(world: WorldGrid, position: Position, faction: Faction): Unit | null {
    // Can only spawn on the farm tile itself
    const farmTile = world[position.y][position.x];

    if (!this.isValidSpawnTile(farmTile)) {
      return null;
    }

    const foodScore = faction.calculateFoodScore(world);
    const troop = new Farmer(this.faction, foodScore);
    this.placeTroop(troop, world, position);
    return troop;
  }

}
