import type { Unit } from '../units/Unit';
import type { Building } from '../buildings/Building';
import type { Strategy } from '../strategy/Strategy';
import { NEUTRAL_FOOD_SCORE, UNIT_PENALTY_THRESHOLD, UNIT_PENALTY_AMOUNT } from '../constants';

export class Faction {
  public id: number;
  public color: number;
  public startPosition: { x: number; y: number };
  public units: Set<Unit> = new Set();
  public buildings: Set<Building> = new Set();
  public strategy: Strategy | null = null;
  public isNeutral: boolean = false;
  public defeated: boolean = false;
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
    // Clamp to [NEUTRAL_FOOD_SCORE, 1]
    return Math.max(NEUTRAL_FOOD_SCORE, Math.min(1, this.rawFoodScore));
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

    if (this.units.size > UNIT_PENALTY_THRESHOLD) {
      this.rawFoodScore -= UNIT_PENALTY_AMOUNT;
    }
  }

  public removeUnit(unit: Unit): void {
    if (this.units.delete(unit)) {
      if (this.isNeutral) return; // Neutral faction ignores food score changes

      if (this.units.size >= UNIT_PENALTY_THRESHOLD) {
        this.rawFoodScore += UNIT_PENALTY_AMOUNT;
      }
    }
  }

  public addBuilding(building: Building): void {
    this.buildings.add(building);
  }

  public removeBuilding(building: Building): void {
    this.buildings.delete(building);
  }

  /**
   * Transfer all units and buildings from this faction to the target faction.
   * Also updates farm occupancy effects appropriately.
   */
  public transferAllAssetsTo(target: Faction): void {
    if (this === target) return;

    // Transfer units
    const unitsToTransfer = [...this.units];
    for (const unit of unitsToTransfer) {
      this.removeUnit(unit);
      unit.faction = target;
      target.addUnit(unit);
    }

    // Transfer buildings
    const buildingsToTransfer = [...this.buildings];
    for (const building of buildingsToTransfer) {
      this.removeBuilding(building);

      // Adjust food score for farms
      if (building.type === 'farm') {
        this.onFarmUnoccupied();
        target.onFarmOccupied();
      }

      building.faction = target;
      target.addBuilding(building);
    }

    this.defeated = true;
  }
}
