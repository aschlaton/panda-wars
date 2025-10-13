import type { Faction } from '../faction/Faction';
import type { WorldGrid } from '../world/terrain';
import type { GameState } from '../types';
import { processArmies } from '../armies/armyMovement';

/**
 * Process a full game turn (all factions take their turn sequentially).
 */
export function processGameTurn(state: GameState): void {
  const turnStart = performance.now();

  if (!state.world) return;

  for (const faction of state.factions) {
    const factionStart = performance.now();
    processFactionTurnWithFactions(faction, state.world, state.factions, state);

    // Process armies for this faction immediately after their turn
    processArmiesForFaction(state, faction);

    const factionTime = performance.now() - factionStart;

    if (factionTime > 100) {
      console.log(`Faction ${faction.id} took ${factionTime.toFixed(2)}ms (${faction.units.size} units)`);
    }
  }

  const totalTime = performance.now() - turnStart;
  if (totalTime > 500) {
    console.log(`⚠️ Turn took ${totalTime.toFixed(2)}ms`);
  }
}

/**
 * Process armies for a specific faction
 */
function processArmiesForFaction(state: GameState, faction: Faction): void {
  processArmies(state, faction);
}

/**
 * Process a single faction's turn with access to all factions.
 */
function processFactionTurnWithFactions(faction: Faction, world: WorldGrid, allFactions: Faction[], state: GameState): void {
  // 1. Process building production
  for (const building of faction.buildings) {
    building.processTurn(world);
  }

  // 2. Make decisions using faction's strategy (now creates armies instead of moving units)
  if (!faction.strategy) return;

  faction.strategy.makeDecision(faction, allFactions, state);
}
