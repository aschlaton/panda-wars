import type { Unit } from '../units/Unit';
import type { WorldGrid } from '../world/terrain';
import type { Faction } from '../faction/Faction';
import type { Position } from '../types';
import { NEUTRAL_BUILDING_CAPACITY, PRODUCTION_INTERVAL_MIN, PRODUCTION_INTERVAL_MAX } from '../constants';

export abstract class Building {
  public type: string;
  public faction: Faction;
  public position: Position;
  public defenseMultiplier: number;
  public productionInterval: number | null; // null means no production
  public productionTicker: number;
  public garrison: Unit[] = []; // Units stationed in this building
  public capacity: number; // Max units before production stops

  constructor(type: string, faction: Faction, position: Position, defenseMultiplier: number, productionInterval: number | null, initialTicker: number, capacity: number = 10) {
    this.type = type;
    this.faction = faction;
    this.position = position;
    this.defenseMultiplier = defenseMultiplier;
    this.productionInterval = productionInterval;
    this.productionTicker = initialTicker;
    this.capacity = capacity;
  }

  // Override this method in subclasses to define what troops to produce
  protected abstract createTroop(): Unit;

  // Attempt to produce a troop
  public processTurn(_world: WorldGrid): Unit | null {
    if (this.productionInterval === null) return null;

    const effectiveCapacity = this.faction.isNeutral ? Math.min(this.capacity, NEUTRAL_BUILDING_CAPACITY) : this.capacity;

    // Don't produce if at capacity
    if (this.garrison.length >= effectiveCapacity) return null;

    // Decrement ticker
    if (this.productionTicker > 0) {
      this.productionTicker--;
      return null;
    }

    // Create troop directly (no spawn position needed - goes into garrison)
    const troop = this.createTroop();
    this.garrison.push(troop);
    this.faction.addUnit(troop);
    this.productionTicker = this.productionInterval;

    this.productionInterval = Math.floor(Math.random() * (PRODUCTION_INTERVAL_MAX - PRODUCTION_INTERVAL_MIN + 1)) + PRODUCTION_INTERVAL_MIN;

    return troop;
  }
}
