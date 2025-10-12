import type { Position } from '../types';
import type { WorldGrid } from '../world/terrain';
import type { Faction } from '../faction/Faction';
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
 * Heuristic function for A* using true hex distance.
 * Converts odd-r offset coordinates to cube coords and computes cube distance.
 */
function heuristic(a: Position, b: Position): number {
  const aCube = offsetOddRToCube(a);
  const bCube = offsetOddRToCube(b);
  return (
    Math.abs(aCube.x - bCube.x) +
    Math.abs(aCube.y - bCube.y) +
    Math.abs(aCube.z - bCube.z)
  ) / 2;
}

function offsetOddRToCube(p: Position): { x: number; y: number; z: number } {
  const x = p.x - ((p.y - (p.y & 1)) / 2);
  const z = p.y;
  const y = -x - z;
  return { x, y, z };
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
  maxCost?: number,
  movingFaction?: Faction
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
  const openSetKeys = new Set<string>([`${start.x},${start.y}`]);

  // For node n, cameFrom[key] is the node immediately preceding it on the cheapest path
  const cameFrom = new Map<string, Position>();

  // For node n, gScore[key] is the cost of the cheapest path from start to n currently known
  const gScore = new Map<string, number>();
  gScore.set(`${start.x},${start.y}`, 0);

  // For node n, fScore[key] = gScore[key] + h(n). fScore[key] represents our current best guess
  const fScore = new Map<string, number>();
  fScore.set(`${start.x},${start.y}`, heuristic(start, goal));

  // Limit iterations to prevent freezing
  const maxIterations = 1000;
  let iterations = 0;

  while (openSet.length > 0 && iterations < maxIterations) {
    iterations++;
    // Get node with lowest fScore (optimized - find min instead of full sort)
    let minIndex = 0;
    let minScore = fScore.get(`${openSet[0].x},${openSet[0].y}`) ?? Infinity;

    for (let i = 1; i < openSet.length; i++) {
      const score = fScore.get(`${openSet[i].x},${openSet[i].y}`) ?? Infinity;
      if (score < minScore) {
        minScore = score;
        minIndex = i;
      }
    }

    const current = openSet[minIndex];
    openSet.splice(minIndex, 1);
    const currentKey = `${current.x},${current.y}`;
    openSetKeys.delete(currentKey);

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

      // Treat allied units as obstacles. Allow passing through enemy units during pathfinding.
      if (neighborTile.unit && !(neighbor.x === goal.x && neighbor.y === goal.y)) {
        const isAlly = movingFaction && neighborTile.unit.faction === movingFaction;
        if (!movingFaction || isAlly) {
          // If we don't know faction, preserve old behavior (block). If ally, block.
          continue;
        }
        // Enemy unit: allowed in path plan; movement will resolve via attack.
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
        if (!openSetKeys.has(neighborKey)) {
          openSet.push(neighbor);
          openSetKeys.add(neighborKey);
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
