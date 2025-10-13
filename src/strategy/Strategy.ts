import type { Faction } from '../faction/Faction';
import type { GameState } from '../types';

/**
 * Base strategy interface for AI decision making.
 * Implement this interface to create different AI behaviors.
 */
export interface Strategy {
  /**
   * Decide what actions a faction should take this turn (create armies from buildings).
   *
   * @param faction - The faction making decisions
   * @param allFactions - All factions in the game (for finding enemies)
   * @param state - Game state (for creating armies)
   * @returns true if an action was taken, false if faction passes
   */
  makeDecision(faction: Faction, allFactions: Faction[], state: GameState): boolean;
}

/**
 * Abstract base class for strategies with common helper methods.
 */
export abstract class BaseStrategy implements Strategy {
  abstract makeDecision(faction: Faction, allFactions: Faction[], state: GameState): boolean;

  // Add helper methods here that all strategies can use
}
