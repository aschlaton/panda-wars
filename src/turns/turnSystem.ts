import type { Faction } from '../faction/Faction';
import type { WorldGrid } from '../world/terrain';
import { makeUnitDecision } from '../ai/unitAI';

/**
 * Process a single faction's turn.
 * 1. Process building production
 * 2. Make decisions for each unit
 */
export function processFactionTurn(faction: Faction, world: WorldGrid): void {
  // 1. Process building production
  for (const building of faction.buildings) {
    building.processTurn(world);
  }

  // 2. Make decisions for each unit
  // Create a copy of units since units might die during iteration
  const unitsCopy = [...faction.units];

  for (const unit of unitsCopy) {
    // Skip if unit died during this turn
    if (!unit.isAlive()) continue;

    // Make AI decision for this unit
    makeUnitDecision(unit, unit.position, world);
  }
}

/**
 * Process a full game turn (all factions take their turn sequentially).
 */
export function processGameTurn(factions: Faction[], world: WorldGrid): void {
  for (const faction of factions) {
    processFactionTurn(faction, world);
  }
}
