import type { Unit } from '../units/Unit';
import type { WorldGrid } from '../world/terrain';
import type { Position } from '../types';

/**
 * Make a decision for a single unit.
 * For now, just pass (do nothing).
 *
 * @param unit - The unit to make a decision for
 * @param unitPos - The current position of the unit
 * @param world - The world grid
 * @returns true if the unit took an action, false if it passed
 */
export function makeUnitDecision(
  _unit: Unit,
  _unitPos: Position,
  _world: WorldGrid
): boolean {
  // TODO: Implement AI logic
  // For now, just pass (do nothing)
  return false;
}
