import type { Unit } from '../units/Unit';
import type { WorldGrid } from '../world/terrain';
import type { Position } from '../types';
import { resolveCombat } from './combat';

/**
 * Execute combat when a unit attacks another unit on a tile.
 * Handles the full combat sequence including cleanup.
 */
export function executeAttack(
  attacker: Unit,
  attackerPos: Position,
  defenderPos: Position,
  world: WorldGrid
): boolean {
  const defenderTile = world[defenderPos.y][defenderPos.x];
  const defender = defenderTile.unit;

  if (!defender) {
    throw new Error('No defender at target position');
  }

  // Resolve combat
  const result = resolveCombat(attacker, defender, defenderTile);

  // Clean up dead units
  if (!result.defenderSurvived) {
    // Remove defender from tile
    defenderTile.unit = undefined;

    // Remove from faction
    defender.faction.removeUnit(defender);

    // If attacker survived, move to defender's tile
    if (result.attackerSurvived) {
      const attackerTile = world[attackerPos.y][attackerPos.x];
      attackerTile.unit = undefined;
      defenderTile.unit = attacker;
    }
  }

  if (!result.attackerSurvived) {
    // Remove attacker from tile
    const attackerTile = world[attackerPos.y][attackerPos.x];
    attackerTile.unit = undefined;

    // Remove from faction
    attacker.faction.removeUnit(attacker);
  }

  return result.attackerSurvived;
}
