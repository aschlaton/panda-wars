import type { Unit } from '../units/Unit';
import type { Building } from '../buildings/Building';

export class Faction {
  public id: number;
  public color: number;
  public startPosition: { x: number; y: number };
  public units: Set<Unit> = new Set();
  public buildings: Set<Building> = new Set();
  private rawFoodScore: number = 1.0; // Uncapped food score

  constructor(id: number, color: number, startPosition: { x: number; y: number }) {
    this.id = id;
    this.color = color;
    this.startPosition = startPosition;
  }

  /**
   * Get the effective food score (capped between 0 and 1).
   */
  public getFoodScore(): number {
    return Math.max(0, Math.min(1, this.rawFoodScore));
  }

  /**
   * Called when a farm becomes occupied by this faction.
   */
  public onFarmOccupied(): void {
    this.rawFoodScore += 0.12;
  }

  /**
   * Called when a farm is no longer occupied by this faction.
   */
  public onFarmUnoccupied(): void {
    this.rawFoodScore -= 0.12;
  }

  public addUnit(unit: Unit): void {
    this.units.add(unit);

    // Apply troop penalty if over 10
    if (this.units.size > 10) {
      this.rawFoodScore -= 0.01;
    }
  }

  public removeUnit(unit: Unit): void {
    if (this.units.delete(unit)) {
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
