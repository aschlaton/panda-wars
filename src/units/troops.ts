import { Unit, CombatType } from './Unit';
import { TerrainType } from '../world/terrain';

export class Warrior extends Unit {
  constructor(ownerId: number) {
    super(ownerId, 'warrior', 100, 12, 10, CombatType.Melee, TerrainType.Grass);
  }
}

export class Archer extends Unit {
  constructor(ownerId: number) {
    super(ownerId, 'archer', 80, 15, 5, CombatType.Ranged, TerrainType.Forest);
  }
}

export class Monk extends Unit {
  constructor(ownerId: number) {
    super(ownerId, 'monk', 90, 10, 12, CombatType.Magic, TerrainType.Mountain);
  }
}

export class Farmer extends Unit {
  constructor(ownerId: number) {
    super(ownerId, 'farmer', 60, 5, 5, CombatType.None, null);
  }
}
