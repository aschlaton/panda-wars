import { Building } from './Building';
import type { Unit } from '../units/Unit';
import type { Position } from '../types';
import type { Faction } from '../faction/Faction';
import { Warrior, Archer, Monk, Farmer } from '../units/troops';

export class Capital extends Building {
  public originalOwner: Faction; // Track who this capital originally belonged to

  constructor(faction: Faction, position: Position) {
    super('capital', faction, position, 0.75, 3, 1, 25); // 25% damage reduction, produces every 3 turns, starts at ticker 1, capacity 25
    this.originalOwner = faction; // Set original owner at creation
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
    super('settlement', faction, position, 0.85, null, -1); // 15% damage reduction, no production
  }

  protected createTroop(): Unit {
    // Settlements don't produce
    throw new Error('Settlement should not produce troops');
  }
}

export class ArcheryRange extends Building {
  constructor(faction: Faction, position: Position) {
    super('archery_range', faction, position, 0.85, 3, 3); // 15% damage reduction, starts at 3 turns
  }

  protected createTroop(): Unit {
    const foodScore = this.faction.getFoodScore();
    return new Archer(this.faction, this.position, foodScore);
  }
}

export class Monastery extends Building {
  constructor(faction: Faction, position: Position) {
    super('monastery', faction, position, 0.85, 3, 3); // 15% damage reduction, starts at 3 turns
  }

  protected createTroop(): Unit {
    const foodScore = this.faction.getFoodScore();
    return new Monk(this.faction, this.position, foodScore);
  }
}

export class Barracks extends Building {
  constructor(faction: Faction, position: Position) {
    super('barracks', faction, position, 0.85, 3, 3); // 15% damage reduction, starts at 3 turns
  }

  protected createTroop(): Unit {
    const foodScore = this.faction.getFoodScore();
    return new Warrior(this.faction, this.position, foodScore);
  }
}

export class Farm extends Building {
  constructor(faction: Faction, position: Position) {
    super('farm', faction, position, 1.0, 3, 3); // No defense bonus (1.0x = full damage), starts at 3 turns
  }

  protected createTroop(): Unit {
    const foodScore = this.faction.getFoodScore();
    return new Farmer(this.faction, this.position, foodScore);
  }
}
