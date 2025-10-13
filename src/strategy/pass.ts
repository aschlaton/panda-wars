import { BaseStrategy } from './Strategy';
import type { Faction } from '../faction/Faction';
import type { GameState } from '../types';

/**
 * Pass strategy - faction does nothing.
 * Useful for neutral factions or player-controlled factions.
 */
export class PassStrategy extends BaseStrategy {
  makeDecision(_faction: Faction, _allFactions: Faction[], _state: GameState): boolean {
    // Always pass (do nothing)
    return false;
  }
}
