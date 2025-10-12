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
  private unitPaths: Map<any, { path: Position[], target: Position }> = new Map();

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

        // Early exit if adjacent building found
        if (dist === 1) {
          break;
        }
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

    // Check if we have a cached path for this unit to the same target
    const cachedPath = this.unitPaths.get(unit);
    let pathResult: import('../utils/pathfinding').PathResult;

    if (cachedPath && cachedPath.target.x === nearestBuilding.x && cachedPath.target.y === nearestBuilding.y) {
      // Reuse cached path
      pathResult = { path: cachedPath.path, cost: 0, found: true };
    } else {
      // Calculate new path using A*
      pathResult = findPath(unit.position, nearestBuilding, world, undefined, unit.faction);

      if (pathResult.found && pathResult.path.length > 1) {
        // Cache the path
        this.unitPaths.set(unit, { path: pathResult.path, target: nearestBuilding });
      }
    }

    if (!pathResult.found || pathResult.path.length <= 1) {
      return false;
    }

    // Find current position in path
    let pathIndex = 0;
    for (let i = 0; i < pathResult.path.length; i++) {
      if (pathResult.path[i].x === unit.position.x && pathResult.path[i].y === unit.position.y) {
        pathIndex = i + 1;
        break;
      }
    }

    // Follow the path with available movement points
    let tookAction = false;

    while (unit.movementPoints > 0 && pathIndex < pathResult.path.length) {
      const nextStep = pathResult.path[pathIndex];
      const moved = moveUnit(unit, unit.position, nextStep, world);

      if (!moved) {
        // Path blocked, invalidate cache and recompute next turn
        this.unitPaths.delete(unit);
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
