import { BaseStrategy } from './Strategy';
import type { Unit } from '../units/Unit';
import type { WorldGrid } from '../world/terrain';
import type { Position } from '../types';
import { getNextStep } from '../utils/pathfinding';
import { moveUnit } from '../units/movement';

/**
 * Simple rush strategy - move toward nearest enemy and attack.
 */
export class ClaudeRushStrategy extends BaseStrategy {
  makeDecision(unit: Unit, world: WorldGrid): boolean {
    // Find nearest enemy (unit or building)
    let nearestEnemy: Position | null = null;
    let nearestDist = Infinity;

    const mapHeight = world.length;
    const mapWidth = world[0].length;

    for (let row = 0; row < mapHeight; row++) {
      for (let col = 0; col < mapWidth; col++) {
        const tile = world[row][col];
        const pos = { x: col, y: row };

        // Check for enemy unit
        if (tile.unit && tile.unit.faction !== unit.faction) {
          const dist = this.manhattanDistance(unit.position, pos);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestEnemy = pos;
          }
        }

        // Check for enemy building
        if (tile.building && tile.building.faction !== unit.faction) {
          const dist = this.manhattanDistance(unit.position, pos);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestEnemy = pos;
          }
        }
      }
    }

    if (!nearestEnemy) {
      return false;
    }

    // Move toward enemy while we have movement points
    let tookAction = false;
    while (unit.movementPoints > 0) {
      const nextStep = getNextStep(unit.position, nearestEnemy, world);
      if (!nextStep) {
        break;
      }

      const moved = moveUnit(unit, unit.position, nextStep, world);
      if (!moved) {
        break;
      }

      tookAction = true;
    }

    return tookAction;
  }

  private manhattanDistance(a: Position, b: Position): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }
}
