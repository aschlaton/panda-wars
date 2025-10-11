import type { Unit } from '../units/Unit';
import type { Tile } from '../world/terrain';

export interface CombatResult {
  attackerSurvived: boolean;
  defenderSurvived: boolean;
  attackerDamageDealt: number;
  defenderDamageDealt: number;
}

/**
 * Resolves combat between an attacking unit and a defending unit on a combat tile.
 * Defender attacks first using their defense stat.
 * If attacker survives, they counter-attack using their attack stat.
 *
 * @param attacker - The unit initiating combat
 * @param defender - The unit being attacked
 * @param combatTile - The tile where combat takes place (for terrain and building bonuses)
 * @returns CombatResult with survival status and damage dealt
 */
export function resolveCombat(
  attacker: Unit,
  defender: Unit,
  combatTile: Tile
): CombatResult {
  const terrain = combatTile.terrainType;
  const building = combatTile.building;

  // Defender attacks first using their DEFENSE stat
  const defenderDamageDealt = defender.getEffectiveDefense(attacker, terrain);

  // Attacker takes damage (no building bonus for attacker)
  attacker.takeDamage(defenderDamageDealt);

  let attackerDamageDealt = 0;

  // If attacker survives, they counter-attack using their ATTACK stat
  if (attacker.isAlive()) {
    const attackerEffectiveAttack = attacker.getEffectiveAttack(defender, terrain);
    attackerDamageDealt = attackerEffectiveAttack;

    // Defender takes damage (with building bonus if they own it)
    defender.takeDamage(attackerDamageDealt, building);
  }

  return {
    attackerSurvived: attacker.isAlive(),
    defenderSurvived: defender.isAlive(),
    attackerDamageDealt,
    defenderDamageDealt,
  };
}
