import type { Position } from '../types';
import type { WorldGrid } from '../world/terrain';
import { TERRAIN_INFO } from '../world/terrain';
import { getHexNeighbors } from './hexUtils';

/**
 * A* pathfinding result
 */
export interface PathResult {
  path: Position[];  // Array of positions from start to goal (inclusive)
  cost: number;      // Total movement cost
  found: boolean;    // Whether a path was found
}

/**
 * Heuristic function for A* (Manhattan distance for hex grids)
 */
function heuristic(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Find the shortest path from start to goal using A* algorithm.
 * Takes terrain movement costs into account.
 * Treats all units as obstacles (cannot path through them), except the goal tile.
 *
 * @param start - Starting position
 * @param goal - Goal position
 * @param world - The world grid
 * @param maxCost - Optional maximum cost (useful for checking "can I reach this in X movement points?")
 * @returns PathResult with path, cost, and whether path was found
 */
export function findPath(
  start: Position,
  goal: Position,
  world: WorldGrid,
  maxCost?: number
): PathResult {
  const mapWidth = world[0].length;
  const mapHeight = world.length;

  // Early exit if start or goal out of bounds
  if (start.x < 0 || start.x >= mapWidth || start.y < 0 || start.y >= mapHeight) {
    return { path: [], cost: 0, found: false };
  }
  if (goal.x < 0 || goal.x >= mapWidth || goal.y < 0 || goal.y >= mapHeight) {
    return { path: [], cost: 0, found: false };
  }

  // If already at goal
  if (start.x === goal.x && start.y === goal.y) {
    return { path: [start], cost: 0, found: true };
  }

  // Priority queue (min-heap by fScore)
  const openSet: Position[] = [start];

  // For node n, cameFrom[key] is the node immediately preceding it on the cheapest path
  const cameFrom = new Map<string, Position>();

  // For node n, gScore[key] is the cost of the cheapest path from start to n currently known
  const gScore = new Map<string, number>();
  gScore.set(`${start.x},${start.y}`, 0);

  // For node n, fScore[key] = gScore[key] + h(n). fScore[key] represents our current best guess
  const fScore = new Map<string, number>();
  fScore.set(`${start.x},${start.y}`, heuristic(start, goal));

  while (openSet.length > 0) {
    // Get node with lowest fScore
    openSet.sort((a, b) => {
      const aScore = fScore.get(`${a.x},${a.y}`) ?? Infinity;
      const bScore = fScore.get(`${b.x},${b.y}`) ?? Infinity;
      return aScore - bScore;
    });

    const current = openSet.shift()!;
    const currentKey = `${current.x},${current.y}`;

    // Reached goal
    if (current.x === goal.x && current.y === goal.y) {
      const path = reconstructPath(cameFrom, current);
      const cost = gScore.get(currentKey) ?? 0;
      return { path, cost, found: true };
    }

    // Explore neighbors
    const neighbors = getHexNeighbors(current, mapWidth, mapHeight);

    for (const neighbor of neighbors) {
      const neighborKey = `${neighbor.x},${neighbor.y}`;
      const neighborTile = world[neighbor.y][neighbor.x];

      // Skip tiles with any unit (friendly or enemy) unless it's the goal
      if (neighborTile.unit && !(neighbor.x === goal.x && neighbor.y === goal.y)) {
        continue;
      }

      // Get movement cost for this terrain
      const movementCost = TERRAIN_INFO[neighborTile.terrainType].movementCost;

      const tentativeGScore = (gScore.get(currentKey) ?? Infinity) + movementCost;

      // Skip if exceeds max cost
      if (maxCost !== undefined && tentativeGScore > maxCost) {
        continue;
      }

      // This path to neighbor is better than any previous one
      if (tentativeGScore < (gScore.get(neighborKey) ?? Infinity)) {
        cameFrom.set(neighborKey, current);
        gScore.set(neighborKey, tentativeGScore);
        fScore.set(neighborKey, tentativeGScore + heuristic(neighbor, goal));

        // Add neighbor to openSet if not already there
        if (!openSet.some(pos => pos.x === neighbor.x && pos.y === neighbor.y)) {
          openSet.push(neighbor);
        }
      }
    }
  }

  // No path found
  return { path: [], cost: 0, found: false };
}

/**
 * Reconstruct path from cameFrom map
 */
function reconstructPath(cameFrom: Map<string, Position>, current: Position): Position[] {
  const path = [current];
  let currentKey = `${current.x},${current.y}`;

  while (cameFrom.has(currentKey)) {
    current = cameFrom.get(currentKey)!;
    currentKey = `${current.x},${current.y}`;
    path.unshift(current);
  }

  return path;
}

/**
 * Get the next position to move toward a goal (first step of the path).
 * Returns null if no path exists or already at goal.
 */
export function getNextStep(
  start: Position,
  goal: Position,
  world: WorldGrid,
  maxCost?: number
): Position | null {
  const result = findPath(start, goal, world, maxCost);

  if (!result.found || result.path.length <= 1) {
    return null;
  }

  // Return the second position in the path (first step from start)
  return result.path[1];
}
