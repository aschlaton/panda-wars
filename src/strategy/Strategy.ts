import type { Unit } from '../units/Unit';
import type { WorldGrid } from '../world/terrain';
import type { Faction } from '../faction/Faction';

/**
 * Base strategy interface for AI decision making.
 * Implement this interface to create different AI behaviors.
 */
export interface Strategy {
  /**
   * Decide what action a unit should take this turn.
   *
   * @param unit - The unit making the decision
   * @param world - The world grid
   * @param allFactions - All factions in the game (for finding enemies)
   * @returns true if an action was taken, false if unit passes
   */
  makeDecision(unit: Unit, world: WorldGrid, allFactions: Faction[]): boolean;
}

/**
 * Abstract base class for strategies with common helper methods.
 */
export abstract class BaseStrategy implements Strategy {
  abstract makeDecision(unit: Unit, world: WorldGrid, allFactions: Faction[]): boolean;

  // Add helper methods here that all strategies can use
}
