import type { Unit } from '../units/Unit';
import type { WorldGrid } from '../world/terrain';
import type { Position } from '../types';

export class Faction {
  public id: number;
  public color: number;
  public startPosition: Position;
  public units: Unit[];

  constructor(id: number, color: number, startPosition: Position) {
    this.id = id;
    this.color = color;
    this.startPosition = startPosition;
    this.units = [];
  }

  /**
   * Calculate the faction's current food score.
   * Base: 1.0
   * Penalty: -0.01 per troop over 10
   * Bonus: +0.12 per occupied farm (farm with allied troop on it)
   * Capped: between 0 and 1
   */
  public calculateFoodScore(world: WorldGrid): number {
    const totalTroops = this.units.length;

    // Count occupied farms (farms with allied troops on them)
    let occupiedFarmCount = 0;
    for (const row of world) {
      for (const tile of row) {
        if (tile.building?.type === 'farm' &&
            tile.building.faction === this &&
            tile.unit?.faction === this) {
          occupiedFarmCount++;
        }
      }
    }

    let foodScore = 1.0;

    // Penalty for troops over 10
    if (totalTroops > 10) {
      foodScore -= (totalTroops - 10) * 0.01;
    }

    // Bonus for occupied farms
    foodScore += occupiedFarmCount * 0.12;

    // Cap between 0 and 1
    return Math.max(0, Math.min(1, foodScore));
  }

  public addUnit(unit: Unit): void {
    this.units.push(unit);
  }

  public removeUnit(unit: Unit): void {
    const index = this.units.indexOf(unit);
    if (index !== -1) {
      this.units.splice(index, 1);
    }
  }
}
