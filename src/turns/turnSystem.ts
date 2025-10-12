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

    // Make decision using faction's strategy - pass all factions for enemy finding
    faction.strategy.makeDecision(unit, world, []);
  }
}

/**
 * Process a full game turn (all factions take their turn sequentially).
 */
export function processGameTurn(factions: Faction[], world: WorldGrid): void {
  const turnStart = performance.now();

  for (const faction of factions) {
    const factionStart = performance.now();
    processFactionTurnWithFactions(faction, world, factions);
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
 * Process a single faction's turn with access to all factions.
 */
function processFactionTurnWithFactions(faction: Faction, world: WorldGrid, allFactions: Faction[]): void {
  // 1. Reset movement points for all units
  for (const unit of faction.units) {
    unit.resetMovement();
  }

  // 2. Process building production
  for (const building of faction.buildings) {
    building.processTurn(world);
  }

  // 3. Make decisions for each unit using faction's strategy
  if (!faction.strategy) return;

  const unitsCopy = [...faction.units];

  for (const unit of unitsCopy) {
    if (!unit.isAlive()) continue;
    faction.strategy.makeDecision(unit, world, allFactions);
  }
}
