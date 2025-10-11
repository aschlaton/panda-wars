import { COMBAT_TYPE_ADVANTAGE_MULTIPLIER, FAVORED_TERRAIN_MULTIPLIER } from '../constants';
import { TerrainType } from '../world/terrain';
import type { Building } from '../buildings/Building';

export enum CombatType {
  Melee = 'melee',
  Ranged = 'ranged',
  Magic = 'magic',
  None = 'none',
}

export abstract class Unit {
  public type: string;
  public ownerId: number;
  public health: number;
  public maxHealth: number;
  public attack: number;
  public defense: number;
  public combatType: CombatType;
  public favoredTerrain: TerrainType | null;

  constructor(
    ownerId: number,
    type: string,
    health: number,
    attack: number,
    defense: number,
    combatType: CombatType,
    favoredTerrain: TerrainType | null = null
  ) {
    this.ownerId = ownerId;
    this.type = type;
    this.health = health;
    this.maxHealth = health;
    this.attack = attack;
    this.defense = defense;
    this.combatType = combatType;
    this.favoredTerrain = favoredTerrain;
  }

  // Check if this unit has advantage over target
  hasAdvantage(target: Unit): boolean {
    if (this.combatType === CombatType.Melee && target.combatType === CombatType.Magic) return true;
    if (this.combatType === CombatType.Ranged && target.combatType === CombatType.Melee) return true;
    if (this.combatType === CombatType.Magic && target.combatType === CombatType.Ranged) return true;
    return false;
  }

  // Calculate effective attack against target
  getEffectiveAttack(target: Unit, terrain?: TerrainType): number {
    let multiplier = 1;

    // Combat type advantage
    if (this.hasAdvantage(target)) {
      multiplier *= COMBAT_TYPE_ADVANTAGE_MULTIPLIER;
    }

    // Favored terrain bonus
    if (terrain && this.favoredTerrain && terrain === this.favoredTerrain) {
      multiplier *= FAVORED_TERRAIN_MULTIPLIER;
    }

    return this.attack * multiplier;
  }

  takeDamage(damage: number, building?: Building): void {
    let finalDamage = damage;

    // Apply building defense bonus if on owned building
    if (building && building.ownerId === this.ownerId) {
      finalDamage *= building.defenseMultiplier;
    }

    const actualDamage = Math.max(0, finalDamage - this.defense);
    this.health -= actualDamage;
    this.health = Math.max(0, this.health);
  }

  isAlive(): boolean {
    return this.health > 0;
  }
}
