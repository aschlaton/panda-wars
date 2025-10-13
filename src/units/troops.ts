import { Unit, CombatType } from './Unit';
import { TerrainType } from '../world/terrain';
import type { Faction } from '../faction/Faction';
import type { Position } from '../types';

export class Warrior extends Unit {
  constructor(faction: Faction, position: Position, foodScore: number = 1.0) {
    super(faction, position, 'warrior', 100, 12, 10, CombatType.Melee, TerrainType.Grass, foodScore);
  }
}

export class Archer extends Unit {
  constructor(faction: Faction, position: Position, foodScore: number = 1.0) {
    super(faction, position, 'archer', 80, 15, 5, CombatType.Ranged, TerrainType.Forest, foodScore);
  }
}

export class Monk extends Unit {
  constructor(faction: Faction, position: Position, foodScore: number = 1.0) {
    super(faction, position, 'monk', 90, 10, 12, CombatType.Magic, TerrainType.Mountain, foodScore);
  }
}

export class Farmer extends Unit {
  constructor(faction: Faction, position: Position, foodScore: number = 1.0) {
    super(faction, position, 'farmer', 60, 5, 5, CombatType.None, null, foodScore);
  }
}
