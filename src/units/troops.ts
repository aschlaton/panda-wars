import { Unit, CombatType } from './Unit';
import { TerrainType } from '../world/terrain';
import type { Faction } from '../faction/Faction';

export class Warrior extends Unit {
  constructor(faction: Faction, foodScore: number = 1.0) {
    super(faction, 'warrior', 100, 12, 10, CombatType.Melee, TerrainType.Grass, foodScore);
  }
}

export class Archer extends Unit {
  constructor(faction: Faction, foodScore: number = 1.0) {
    super(faction, 'archer', 80, 15, 5, CombatType.Ranged, TerrainType.Forest, foodScore);
  }
}

export class Monk extends Unit {
  constructor(faction: Faction, foodScore: number = 1.0) {
    super(faction, 'monk', 90, 10, 12, CombatType.Magic, TerrainType.Mountain, foodScore);
  }
}

export class Farmer extends Unit {
  constructor(faction: Faction, foodScore: number = 1.0) {
    super(faction, 'farmer', 60, 5, 5, CombatType.None, null, foodScore, false, false);
  }
}
