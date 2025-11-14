import type { Unit } from '../units/Unit';
import type { Position } from '../types';
import type { Faction } from '../faction/Faction';
import type { Building } from '../buildings/Building';
import { ARMY_MOVEMENT_SPEED } from '../constants';

export class Army {
  public units: Unit[];
  public position: Position;
  public targetPosition: Position;
  public sourceBuilding: Building;
  public targetBuilding: Building;
  public faction: Faction;
  public movementSpeed: number;
  public startPosition: Position; // Track where army started
  public path: Position[] = []; // Track path taken
  public mostCommonUnitType: string; // Cached most common unit type

  constructor(
    units: Unit[],
    sourceBuilding: Building,
    targetBuilding: Building,
    faction: Faction
  ) {
    this.units = units;
    this.position = { ...sourceBuilding.position };
    this.startPosition = { ...sourceBuilding.position };
    this.targetPosition = targetBuilding.position;
    this.sourceBuilding = sourceBuilding;
    this.targetBuilding = targetBuilding;
    this.faction = faction;

    this.movementSpeed = ARMY_MOVEMENT_SPEED;

    // Initialize path with starting position
    this.path = [{ ...this.position }];

    // Compute most common unit type (monk > warrior > archer tiebreaker)
    this.mostCommonUnitType = this.computeMostCommonUnitType();
  }

  private computeMostCommonUnitType(): string {
    const counts = new Map<string, number>();
    for (const unit of this.units) {
      counts.set(unit.type, (counts.get(unit.type) || 0) + 1);
    }

    let maxCount = 0;
    let mostCommon = 'warrior';

    // Check monk first (highest priority)
    if (counts.has('monk') && counts.get('monk')! >= maxCount) {
      maxCount = counts.get('monk')!;
      mostCommon = 'monk';
    }

    // Then warrior
    if (counts.has('warrior') && counts.get('warrior')! > maxCount) {
      maxCount = counts.get('warrior')!;
      mostCommon = 'warrior';
    }

    // Then archer
    if (counts.has('archer') && counts.get('archer')! > maxCount) {
      mostCommon = 'archer';
    }

    return mostCommon;
  }

  /**
   * Move army toward target along straight line
   * Returns true if reached destination
   */
  move(): boolean {
    const dx = this.targetPosition.x - this.position.x;
    const dy = this.targetPosition.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= this.movementSpeed) {
      // Reached target
      this.position = { ...this.targetPosition };
      this.path.push({ ...this.position });
      return true;
    }

    // Move toward target
    const ratio = this.movementSpeed / distance;
    this.position.x = Math.round(this.position.x + dx * ratio);
    this.position.y = Math.round(this.position.y + dy * ratio);
    this.path.push({ ...this.position });
    return false;
  }

  /**
   * Check if army is still valid (has units)
   */
  isValid(): boolean {
    return this.units.length > 0 && this.units.some(u => u.isAlive());
  }
}
