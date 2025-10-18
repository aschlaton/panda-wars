import type { Army } from './Army';
import type { WorldGrid } from '../world/terrain';
import type { GameState } from '../types';
import { resolveBattle } from '../combat/combat';

/**
 * Process armies for a specific faction, or all armies if no faction specified
 */
export function processArmies(state: GameState, faction?: import('../faction/Faction').Faction): void {
  if (!state.world) return;

  // Process armies and mark invalid ones, then filter in one pass
  const armiesToKeep: Army[] = [];

  for (const army of state.armies) {
    // Skip if filtering by faction and army doesn't belong to it
    if (faction && army.faction !== faction) {
      armiesToKeep.push(army);
      continue;
    }
    // Check if army is still valid
    if (!army.isValid()) {
      continue;
    }

    // Move army
    const reachedDestination = army.move();
    const interceptBuilding = checkForInterception(army, state.world);

    // if intercepting, resolve battle early
    if (interceptBuilding) {
      resolveBattle(army, interceptBuilding, state);
    } else if (reachedDestination) {
      // Check if target is still an enemy before attacking
      // if not, garrison units there
      if (army.targetBuilding.faction !== army.faction) {
        resolveBattle(army, army.targetBuilding, state);
      } else {
        army.targetBuilding.garrison.push(...army.units.filter(u => u.isAlive()));
      }
    } else {
      // Army is still moving
      armiesToKeep.push(army);
    }
  }

  // Replace army array with filtered version (O(n) instead of O(n²))
  state.armies = armiesToKeep;
}

/**
 * Check if army path intersects with an enemy building
 */
function checkForInterception(army: Army, world: WorldGrid): import('../buildings/Building').Building | null {
  const tile = world[army.position.y]?.[army.position.x];
  if (!tile) return null;

  // Check if there's an enemy building on this tile
  if (tile.building && tile.building.faction !== army.faction) {
    return tile.building;
  }

  return null;
}
