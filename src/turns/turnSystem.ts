import type { Faction } from '../faction/Faction';
import type { WorldGrid } from '../world/terrain';

/**
 * Process a single faction's turn.
 * 1. Reset movement points
 * 2. Process building production
 * 3. Make decisions for each unit using faction's strategy
 */
export function processFactionTurn(faction: Faction, world: WorldGrid): void {
  // 1. Reset movement points for all units
  for (const unit of faction.units) {
    unit.resetMovement();
  }

  // 2. Process building production
  for (const building of faction.buildings) {
    building.processTurn(world);
  }

  // 3. Make decisions for each unit using faction's strategy
  if (!faction.strategy) return; // No strategy = skip unit AI entirely

  // Create a copy of units since units might die during iteration
  const unitsCopy = [...faction.units];

  for (const unit of unitsCopy) {
    // Skip if unit died during this turn
    if (!unit.isAlive()) continue;

    // Make decision using faction's strategy
    faction.strategy.makeDecision(unit, world);
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
