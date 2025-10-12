import { BaseStrategy } from './Strategy';
import type { Unit } from '../units/Unit';
import type { WorldGrid } from '../world/terrain';
import type { Faction } from '../faction/Faction';

/**
 * Pass strategy - units do nothing.
 * Useful for neutral factions or player-controlled factions.
 */
export class PassStrategy extends BaseStrategy {
  makeDecision(_unit: Unit, _world: WorldGrid, _allFactions: Faction[]): boolean {
    // Always pass (do nothing)
    return false;
  }
}
