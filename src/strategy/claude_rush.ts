import { BaseStrategy } from './Strategy';
import type { Position } from '../types';
import type { GameState } from '../types';
import type { Faction } from '../faction/Faction';
import type { StrategyDecision } from './Strategy';
import { MAX_ARMIES_PER_TURN, MIN_GARRISON_FOR_ATTACK, MIN_UNITS_TO_SEND, GARRISON_RESERVE } from '../constants';

export class ClaudeRushStrategy extends BaseStrategy {
  makeDecision(faction: Faction, _allFactions: Faction[], state: GameState): StrategyDecision {
    const armies: StrategyDecision['armies'] = [];

    if (!state.allBuildings || state.allBuildings.length === 0) {
      return { armies };
    }

    const enemyBuildings = state.allBuildings.filter(b => b.faction !== faction);
    let armiesSent = 0;

    for (const building of faction.buildings) {
      if (armiesSent >= MAX_ARMIES_PER_TURN) break;
      if (building.garrison.length < MIN_GARRISON_FOR_ATTACK) continue;

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

      const unitsToSend = Math.max(MIN_UNITS_TO_SEND, building.garrison.length - GARRISON_RESERVE);
      if (unitsToSend >= MIN_UNITS_TO_SEND && building.garrison.length >= unitsToSend) {
        armies.push({
          sourceBuilding: building,
          targetBuilding: nearestEnemy,
          unitCount: unitsToSend
        });
        armiesSent++;
      }
    }

    return { armies };
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
