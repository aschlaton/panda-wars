import type { Unit } from '../units/Unit';
import type { Building } from '../buildings/Building';
import type { Strategy } from '../strategy/Strategy';
import { NEUTRAL_FOOD_SCORE } from '../constants';

export class Faction {
  public id: number;
  public color: number;
  public startPosition: { x: number; y: number };
  public units: Set<Unit> = new Set();
  public buildings: Set<Building> = new Set();
  public strategy: Strategy | null = null;
  public isNeutral: boolean = false;
  private rawFoodScore: number = 1.0; // Uncapped food score

  constructor(id: number, color: number, startPosition: { x: number; y: number }, strategy: Strategy | null = null, isNeutral: boolean = false) {
    this.id = id;
    this.color = color;
    this.startPosition = startPosition;
    this.strategy = strategy;
    this.isNeutral = isNeutral;
  }

  /**
   * Get the effective food score (capped between 0 and 1).
   * Neutral factions always have NEUTRAL_FOOD_SCORE.
   */
  public getFoodScore(): number {
    if (this.isNeutral) return NEUTRAL_FOOD_SCORE;
    return Math.max(0, Math.min(1, this.rawFoodScore));
  }

  /**
   * Called when a farm becomes occupied by this faction.
   */
  public onFarmOccupied(): void {
    if (this.isNeutral) return; // Neutral faction ignores food score changes
    this.rawFoodScore += 0.12;
  }

  /**
   * Called when a farm is no longer occupied by this faction.
   */
  public onFarmUnoccupied(): void {
    if (this.isNeutral) return; // Neutral faction ignores food score changes
    this.rawFoodScore -= 0.12;
  }

  public addUnit(unit: Unit): void {
    this.units.add(unit);

    if (this.isNeutral) return; // Neutral faction ignores food score changes

    // Apply troop penalty if over 10
    if (this.units.size > 10) {
      this.rawFoodScore -= 0.01;
    }
  }

  public removeUnit(unit: Unit): void {
    if (this.units.delete(unit)) {
      if (this.isNeutral) return; // Neutral faction ignores food score changes

      // Remove troop penalty if still over 10
      if (this.units.size >= 10) {
        this.rawFoodScore += 0.01;
      }
    }
  }

  public addBuilding(building: Building): void {
    this.buildings.add(building);
  }

  public removeBuilding(building: Building): void {
    this.buildings.delete(building);
  }
}
