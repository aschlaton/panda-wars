import type { Faction } from '../faction/Faction';
import type { GameState } from '../types';
import type { Building } from '../buildings/Building';

export interface ArmyDecision {
  sourceBuilding: Building;
  targetBuilding: Building;
  unitCount: number;
}

export interface StrategyDecision {
  armies: ArmyDecision[];
}

export interface Strategy {
  makeDecision(faction: Faction, allFactions: Faction[], state: GameState): StrategyDecision;
}

export abstract class BaseStrategy implements Strategy {
  abstract makeDecision(faction: Faction, allFactions: Faction[], state: GameState): StrategyDecision;
}
