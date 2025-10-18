import { BaseStrategy } from './Strategy';
import type { Position } from '../types';
import type { GameState } from '../types';
import type { Faction } from '../faction/Faction';
import { Army } from '../armies/Army';

/**
 * Army-based rush strategy - send armies from buildings to attack nearest enemy buildings
 */
export class ClaudeRushStrategy extends BaseStrategy {
  makeDecision(faction: Faction, _allFactions: Faction[], state: GameState): boolean {
    // Use global building cache and filter enemies
    if (!state.allBuildings || state.allBuildings.length === 0) {
      return false;
    }

    const enemyBuildings = state.allBuildings.filter(b => b.faction !== faction);

    let tookAction = false;

    // Limit to max 3 armies per turn to avoid spam
    let armiesSent = 0;
    const maxArmiesPerTurn = 3;

    // Iterate directly without creating intermediate array
    for (const building of faction.buildings) {
      if (armiesSent >= maxArmiesPerTurn) break;

      // Only send armies from buildings with 5+ units
      if (building.garrison.length < 5) continue;

      // Find nearest enemy building
      let nearestEnemy = null;
      let nearestDist = Infinity;

      for (const enemyBuilding of enemyBuildings) {
        const dist = this.manhattanDistance(building.position, enemyBuilding.position);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestEnemy = enemyBuilding;
        }
      }

      if (!nearestEnemy) continue;

      // Send army if we have enough units (at least 3, and leave at least 2 in garrison)
      const unitsToSend = Math.max(3, building.garrison.length - 2);
      if (unitsToSend >= 3 && building.garrison.length >= unitsToSend) {
        // Create army
        const armyUnits = building.garrison.splice(0, unitsToSend);
        const army = new Army(armyUnits, building, nearestEnemy, faction);
        state.armies.push(army);
        console.log(`🚀 Army created: ${unitsToSend} units from (${building.position.x},${building.position.y}) → (${nearestEnemy.position.x},${nearestEnemy.position.y})`);
        tookAction = true;
        armiesSent++;
      }
    }

    return tookAction;
  }

  private manhattanDistance(a: Position, b: Position): number {
    // Use true hex distance for odd-r offset coordinates by converting to cube coords
    const aCube = this.offsetOddRToCube(a);
    const bCube = this.offsetOddRToCube(b);
    return (
      Math.abs(aCube.x - bCube.x) +
      Math.abs(aCube.y - bCube.y) +
      Math.abs(aCube.z - bCube.z)
    ) / 2;
  }

  private offsetOddRToCube(p: Position): { x: number; y: number; z: number } {
    const x = p.x - ((p.y - (p.y & 1)) / 2);
    const z = p.y;
    const y = -x - z;
    return { x, y, z };
  }
}
