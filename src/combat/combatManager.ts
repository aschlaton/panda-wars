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

  // If no defender unit, just capture the building
  if (!defender) {
    const attackerTile = world[attackerPos.y][attackerPos.x];

    // Check if leaving a farm
    if (attackerTile.building?.type === 'farm' && attackerTile.building.faction === attacker.faction) {
      attacker.faction.onFarmUnoccupied();
    }

    attackerTile.unit = undefined;
    defenderTile.unit = attacker;
    attacker.position = defenderPos;

    // Capture building if present
    if (defenderTile.building && defenderTile.building.faction !== attacker.faction) {
      const building = defenderTile.building;
      const oldFaction = building.faction;
      oldFaction.removeBuilding(building);
      building.faction = attacker.faction;
      building.position = defenderPos;
      attacker.faction.addBuilding(building);

      // If captured a capital, defeat old faction and transfer assets
      if (building.type === 'capital') {
        oldFaction.transferAllAssetsTo(attacker.faction);
      }
    }

    // Check if occupying a farm
    if (defenderTile.building?.type === 'farm' && defenderTile.building.faction === attacker.faction) {
      attacker.faction.onFarmOccupied();
    }

    return true;
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

      // Check if leaving a farm
      if (attackerTile.building?.type === 'farm' && attackerTile.building.faction === attacker.faction) {
        attacker.faction.onFarmUnoccupied();
      }

      attackerTile.unit = undefined;
      defenderTile.unit = attacker;
      attacker.position = defenderPos;

      // Capture building if present
      if (defenderTile.building && defenderTile.building.faction !== attacker.faction) {
        const building = defenderTile.building;
        const oldFaction = building.faction;
        oldFaction.removeBuilding(building);
        building.faction = attacker.faction;
        building.position = defenderPos;
        attacker.faction.addBuilding(building);

        // If captured a capital, defeat old faction and transfer assets
        if (building.type === 'capital') {
          oldFaction.transferAllAssetsTo(attacker.faction);
        }
      }

      // Check if occupying a farm
      if (defenderTile.building?.type === 'farm' && defenderTile.building.faction === attacker.faction) {
        attacker.faction.onFarmOccupied();
      }
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
