import { BaseStrategy } from './Strategy';
import type { Faction } from '../faction/Faction';
import type { GameState } from '../types';

export class PassStrategy extends BaseStrategy {
  makeDecision(_faction: Faction, _allFactions: Faction[], _state: GameState) {
    return { armies: [] };
  }
}
