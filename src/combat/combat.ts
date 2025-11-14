import type { Army } from '../armies/Army';
import type { Building } from '../buildings/Building';
import type { GameState } from '../types';
import type { Unit } from '../units/Unit';
import { MAX_COMBAT_ROUNDS } from '../constants';

/**
 * Resolve battle between an army and a building's garrison
 * Returns true if attacker won
 */
export function resolveBattle(army: Army, building: Building, state: GameState): boolean {
  const attackers = army.units.filter(u => u.isAlive());
  const defenders = building.garrison.filter(u => u.isAlive());

  if (attackers.length === 0) {
    // No attackers left
    return false;
  }

  if (defenders.length === 0) {
    // No defenders - automatic capture
    captureBuilding(building, army.faction, attackers, state);
    return true;
  }

  let round = 0;

  while (round < MAX_COMBAT_ROUNDS) {
    let livingAttacker: Unit | null = null;
    let livingDefender: Unit | null = null;
    let aliveAttackerCount = 0;
    let aliveDefenderCount = 0;

    for (const u of attackers) {
      if (u.isAlive()) {
        aliveAttackerCount++;
        if (!livingAttacker || Math.random() < 1 / aliveAttackerCount) {
          livingAttacker = u;
        }
      }
    }

    for (const u of defenders) {
      if (u.isAlive()) {
        aliveDefenderCount++;
        if (!livingDefender || Math.random() < 1 / aliveDefenderCount) {
          livingDefender = u;
        }
      }
    }

    if (!livingAttacker || !livingDefender) {
      break;
    }

    round++;

    // Both sides attack simultaneously
    const attackerDamage = livingAttacker.getEffectiveAttack(livingDefender);
    livingDefender.takeDamage(attackerDamage, building);

    // Pick another random living defender and attacker for simultaneous attack
    let livingAttacker2: Unit | null = null;
    let livingDefender2: Unit | null = null;
    let count = 0;

    for (const u of attackers) {
      if (u.isAlive()) {
        count++;
        if (!livingAttacker2 || Math.random() < 1 / count) {
          livingAttacker2 = u;
        }
      }
    }

    count = 0;
    for (const u of defenders) {
      if (u.isAlive()) {
        count++;
        if (!livingDefender2 || Math.random() < 1 / count) {
          livingDefender2 = u;
        }
      }
    }

    if (livingDefender2 && livingAttacker2) {
      const defenderDamage = livingDefender2.getEffectiveDefense(livingAttacker2);
      livingAttacker2.takeDamage(defenderDamage);
    }
  }

  // Check who won
  const survivingAttackers = attackers.filter(u => u.isAlive());
  const survivingDefenders = defenders.filter(u => u.isAlive());

  // Remove dead units from factions
  for (const unit of attackers) {
    if (!unit.isAlive()) {
      army.faction.removeUnit(unit);
    }
  }

  for (const unit of defenders) {
    if (!unit.isAlive()) {
      building.faction.removeUnit(unit);
    }
  }

  // Update garrison
  building.garrison = survivingDefenders;

  if (survivingAttackers.length > 0 && survivingDefenders.length === 0) {
    // Attackers won - capture building
    captureBuilding(building, army.faction, survivingAttackers, state);
    state.minimapNeedsUpdate = true;

    // Update global building cache when ownership changes
    if (state.allBuildings && !state.allBuildings.includes(building)) {
      state.allBuildings.push(building);
    }

    return true;
  }

  return false;
}

/**
 * Capture a building and garrison it with surviving attackers
 */
function captureBuilding(building: Building, newFaction: import('../faction/Faction').Faction, survivors: Unit[], _state: GameState): void {
  const oldFaction = building.faction;

  // Remove from old faction
  oldFaction.removeBuilding(building);

  // Add to new faction
  building.faction = newFaction;
  newFaction.addBuilding(building);

  // Garrison survivors (can exceed capacity)
  building.garrison = survivors;

  // If captured a capital, transfer only the original owner's assets
  if (building.type === 'capital') {
    const capital = building as import('../buildings/buildingTypes').Capital;
    if (capital.originalOwner === oldFaction) {
      // Only transfer if the current owner is the original owner
      oldFaction.transferAllAssetsTo(newFaction);
    }
  }
}
