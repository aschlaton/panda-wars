import { COMBAT_TYPE_ADVANTAGE_MULTIPLIER, FAVORED_TERRAIN_MULTIPLIER } from '../constants';
import { TerrainType } from '../world/terrain';
import type { Building } from '../buildings/Building';
import type { Faction } from '../faction/Faction';

export enum CombatType {
  Melee = 'melee',
  Ranged = 'ranged',
  Magic = 'magic',
  None = 'none',
}

export abstract class Unit {
  public type: string;
  public faction: Faction;
  public position: { x: number; y: number };
  public health: number;
  public maxHealth: number;
  public attack: number;
  public defense: number;
  public combatType: CombatType;
  public favoredTerrain: TerrainType | null;
  public foodScore: number;
  public canMove: boolean;
  public canAttack: boolean;
  public maxMovementPoints: number;
  public movementPoints: number;

  constructor(
    faction: Faction,
    position: { x: number; y: number },
    type: string,
    health: number,
    attack: number,
    defense: number,
    combatType: CombatType,
    favoredTerrain: TerrainType | null = null,
    foodScore: number = 1.0,
    canMove: boolean = true,
    canAttack: boolean = true,
    maxMovementPoints: number = 5
  ) {
    this.faction = faction;
    this.position = position;
    this.type = type;
    this.health = health;
    this.maxHealth = health;
    this.attack = attack;
    this.defense = defense;
    this.combatType = combatType;
    this.favoredTerrain = favoredTerrain;
    this.foodScore = foodScore;
    this.canMove = canMove;
    this.canAttack = canAttack;
    this.maxMovementPoints = maxMovementPoints;
    this.movementPoints = maxMovementPoints;
  }

  public resetMovement(): void {
    this.movementPoints = this.maxMovementPoints;
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

    // Food score multiplier
    multiplier *= this.foodScore;

    return this.attack * multiplier;
  }

  // Calculate effective defense damage when defending
  getEffectiveDefense(target: Unit, terrain?: TerrainType): number {
    let multiplier = 1;

    // Combat type advantage
    if (this.hasAdvantage(target)) {
      multiplier *= COMBAT_TYPE_ADVANTAGE_MULTIPLIER;
    }

    // Favored terrain bonus
    if (terrain && this.favoredTerrain && terrain === this.favoredTerrain) {
      multiplier *= FAVORED_TERRAIN_MULTIPLIER;
    }

    return this.defense * multiplier;
  }

  takeDamage(damage: number, building?: Building): void {
    let finalDamage = damage;

    // Apply building defense bonus if on owned building
    if (building && building.faction === this.faction) {
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
