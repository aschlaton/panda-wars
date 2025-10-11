import type { Unit } from './Unit';
import type { WorldGrid } from '../world/terrain';
import type { Position } from '../types';
import { TERRAIN_INFO } from '../world/terrain';
import { executeAttack } from '../combat/combatManager';
import { getHexNeighbors } from '../utils/hexUtils';

/**
 * Check if a unit can move to a target position (must be adjacent and have enough movement points).
 */
export function canMoveTo(unit: Unit, fromPos: Position, targetPos: Position, world: WorldGrid): boolean {
  const mapWidth = world[0].length;
  const mapHeight = world.length;

  // Check bounds
  if (targetPos.x < 0 || targetPos.x >= mapWidth || targetPos.y < 0 || targetPos.y >= mapHeight) {
    return false;
  }

  // Must be adjacent tile
  const neighbors = getHexNeighbors(fromPos, mapWidth, mapHeight);
  const isAdjacent = neighbors.some(n => n.x === targetPos.x && n.y === targetPos.y);
  if (!isAdjacent) {
    return false;
  }

  const targetTile = world[targetPos.y][targetPos.x];

  // Can't move if unit can't move (e.g., Farmer)
  if (!unit.canMove) {
    return false;
  }

  // Check if enough movement points for terrain cost
  const movementCost = TERRAIN_INFO[targetTile.terrainType].movementCost;
  if (unit.movementPoints < movementCost) {
    return false;
  }

  // Can't move to tile with allied unit
  if (targetTile.unit && targetTile.unit.faction === unit.faction) {
    return false;
  }

  return true;
}

/**
 * Move a unit from one position to another.
 * If there's an enemy unit, attack it instead.
 * Returns true if the move/attack was successful.
 */
export function moveUnit(
  unit: Unit,
  fromPos: Position,
  toPos: Position,
  world: WorldGrid
): boolean {
  if (!canMoveTo(unit, fromPos, toPos, world)) {
    return false;
  }

  const targetTile = world[toPos.y][toPos.x];

  // If there's an enemy unit, attack it
  if (targetTile.unit && targetTile.unit.faction !== unit.faction) {
    // Check if unit can attack
    if (!unit.canAttack) {
      return false;
    }

    return executeAttack(unit, fromPos, toPos, world);
  }

  // Move to empty tile
  const fromTile = world[fromPos.y][fromPos.x];

  // Check if leaving a farm
  if (fromTile.building?.type === 'farm' && fromTile.building.faction === unit.faction) {
    unit.faction.onFarmUnoccupied();
  }

  fromTile.unit = undefined;
  targetTile.unit = unit;

  // Update unit position and deduct movement cost
  unit.position = toPos;
  const movementCost = TERRAIN_INFO[targetTile.terrainType].movementCost;
  unit.movementPoints -= movementCost;

  // Capture building if present
  if (targetTile.building && targetTile.building.faction !== unit.faction) {
    const building = targetTile.building;
    const oldFaction = building.faction;
    oldFaction.removeBuilding(building);
    building.faction = unit.faction;
    building.position = toPos;
    unit.faction.addBuilding(building);
  }

  // Check if occupying a farm
  if (targetTile.building?.type === 'farm' && targetTile.building.faction === unit.faction) {
    unit.faction.onFarmOccupied();
  }

  return true;
}
