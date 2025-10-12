import { BaseStrategy } from './Strategy';
import type { Unit } from '../units/Unit';
import type { WorldGrid } from '../world/terrain';
import type { Position } from '../types';
import { findPath } from '../utils/pathfinding';
import { moveUnit } from '../units/movement';

/**
 * Simple rush strategy - move toward nearest enemy and attack.
 */
export class ClaudeRushStrategy extends BaseStrategy {
  private enemyPositionsCache: Position[] = [];
  private cachedForFaction: any = null;

  makeDecision(unit: Unit, world: WorldGrid, allFactions: import('../faction/Faction').Faction[]): boolean {
    // Build enemy building positions list once per faction (reuse for all units in that faction)
    if (this.cachedForFaction !== unit.faction) {
      this.enemyPositionsCache = [];

      for (const faction of allFactions) {
        if (faction === unit.faction) continue;

        // Only cache enemy buildings (not units)
        for (const building of faction.buildings) {
          this.enemyPositionsCache.push(building.position);
        }
      }

      this.cachedForFaction = unit.faction;
    }

    // Find nearest enemy building from cached positions
    let nearestBuilding: Position | null = null;
    let nearestDist = Infinity;

    for (const pos of this.enemyPositionsCache) {
      const dist = this.manhattanDistance(unit.position, pos);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestBuilding = pos;
      }
    }


    if (!nearestBuilding) {
      return false;
    }

    // If building is adjacent (distance 1), attack/capture it
    if (nearestDist === 1) {
      return moveUnit(unit, unit.position, nearestBuilding, world);
    }

    // Use A* for nearby buildings (< 40 tiles), otherwise skip
    if (nearestDist >= 40) {
      return false;
    }

    // Calculate path using A*
    const pathResult = findPath(unit.position, nearestBuilding, world, undefined, unit.faction);
    if (!pathResult.found || pathResult.path.length <= 1) {
      return false;
    }

    // Follow the path with available movement points
    let tookAction = false;
    let pathIndex = 1; // Start at 1 (skip current position)

    while (unit.movementPoints > 0 && pathIndex < pathResult.path.length) {
      const nextStep = pathResult.path[pathIndex];
      const moved = moveUnit(unit, unit.position, nextStep, world);

      if (!moved) {
        break;
      }

      tookAction = true;
      pathIndex++;
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
