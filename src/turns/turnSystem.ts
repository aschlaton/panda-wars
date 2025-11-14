import type { Faction } from '../faction/Faction';
import type { WorldGrid } from '../world/terrain';
import type { GameState } from '../types';
import { processArmies } from '../armies/armyMovement';
import { Army } from '../armies/Army';

export function processGameTurn(state: GameState): void {
  if (!state.world) return;

  for (const faction of state.factions) {
    processFactionTurnWithFactions(faction, state.world, state.factions, state);
    processArmiesForFaction(state, faction);
  }
}

function processArmiesForFaction(state: GameState, faction: Faction): void {
  processArmies(state, faction);
}

function processFactionTurnWithFactions(faction: Faction, world: WorldGrid, allFactions: Faction[], state: GameState): void {
  for (const building of faction.buildings) {
    building.processTurn(world);
  }

  if (!faction.strategy) return;

  const decision = faction.strategy.makeDecision(faction, allFactions, state);

  for (const armyDecision of decision.armies) {
    if (armyDecision.sourceBuilding.garrison.length < armyDecision.unitCount) continue;

    const units = armyDecision.sourceBuilding.garrison.splice(0, armyDecision.unitCount);
    const army = new Army(units, armyDecision.sourceBuilding, armyDecision.targetBuilding, faction);
    state.armies.push(army);
  }
}
