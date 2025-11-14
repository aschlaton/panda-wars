import { Building } from './Building';
import type { Unit } from '../units/Unit';
import type { Position } from '../types';
import type { Faction } from '../faction/Faction';
import { Warrior, Archer, Monk, Farmer } from '../units/troops';
import {
  CAPITAL_DEFENSE_MULTIPLIER,
  STANDARD_BUILDING_DEFENSE_MULTIPLIER,
  FARM_DEFENSE_MULTIPLIER,
  DEFAULT_PRODUCTION_INTERVAL,
  CAPITAL_CAPACITY,
  DEFAULT_BUILDING_CAPACITY,
} from '../constants';

export class Capital extends Building {
  public originalOwner: Faction; // Track who this capital originally belonged to

  constructor(faction: Faction, position: Position) {
    super('capital', faction, position, CAPITAL_DEFENSE_MULTIPLIER, DEFAULT_PRODUCTION_INTERVAL, 1, CAPITAL_CAPACITY);
    this.originalOwner = faction;
  }

  protected createTroop(): Unit {
    // Random troop type
    const roll = Math.random();
    const foodScore = this.faction.getFoodScore();

    if (roll < 0.33) {
      return new Warrior(this.faction, this.position, foodScore);
    } else if (roll < 0.66) {
      return new Archer(this.faction, this.position, foodScore);
    } else {
      return new Monk(this.faction, this.position, foodScore);
    }
  }

}

export class Settlement extends Building {
  constructor(faction: Faction, position: Position) {
    super('settlement', faction, position, STANDARD_BUILDING_DEFENSE_MULTIPLIER, null, -1);
  }

  protected createTroop(): Unit {
    // Settlements don't produce
    throw new Error('Settlement should not produce troops');
  }
}

export class ArcheryRange extends Building {
  constructor(faction: Faction, position: Position) {
    super('archery_range', faction, position, STANDARD_BUILDING_DEFENSE_MULTIPLIER, DEFAULT_PRODUCTION_INTERVAL, DEFAULT_PRODUCTION_INTERVAL);
  }

  protected createTroop(): Unit {
    const foodScore = this.faction.getFoodScore();
    return new Archer(this.faction, this.position, foodScore);
  }
}

export class Monastery extends Building {
  constructor(faction: Faction, position: Position) {
    super('monastery', faction, position, STANDARD_BUILDING_DEFENSE_MULTIPLIER, DEFAULT_PRODUCTION_INTERVAL, DEFAULT_PRODUCTION_INTERVAL);
  }

  protected createTroop(): Unit {
    const foodScore = this.faction.getFoodScore();
    return new Monk(this.faction, this.position, foodScore);
  }
}

export class Barracks extends Building {
  constructor(faction: Faction, position: Position) {
    super('barracks', faction, position, STANDARD_BUILDING_DEFENSE_MULTIPLIER, DEFAULT_PRODUCTION_INTERVAL, DEFAULT_PRODUCTION_INTERVAL);
  }

  protected createTroop(): Unit {
    const foodScore = this.faction.getFoodScore();
    return new Warrior(this.faction, this.position, foodScore);
  }
}

export class Farm extends Building {
  constructor(faction: Faction, position: Position) {
    super('farm', faction, position, FARM_DEFENSE_MULTIPLIER, DEFAULT_PRODUCTION_INTERVAL, DEFAULT_PRODUCTION_INTERVAL);
  }

  protected createTroop(): Unit {
    const foodScore = this.faction.getFoodScore();
    return new Farmer(this.faction, this.position, foodScore);
  }
}
