import type { Tile } from '../world/terrain';
import type { Army } from '../armies/Army';
import { getFactionName } from '../constants';

export class TilePopup {
  private popupTile: { col: number; row: number } | null = null;
  private popupTimeout: number | null = null;

  show(col: number, row: number, tile: Tile, army: Army | undefined, e: MouseEvent): void {
    if (this.popupTile && this.popupTile.col === col && this.popupTile.row === row) {
      this.hide();
      return;
    }

    const content = this.buildContent(col, row, tile, army);
    this.hide();

    const popup = document.createElement('div');
    popup.id = 'tile-info-popup';
    popup.innerHTML = content;
    popup.style.position = 'absolute';
    popup.style.left = `${e.clientX + 10}px`;
    popup.style.top = `${e.clientY + 10}px`;
    popup.style.zIndex = '1000';
    popup.style.pointerEvents = 'none';

    document.body.appendChild(popup);
    this.popupTile = { col, row };

    this.popupTimeout = window.setTimeout(() => {
      this.hide();
    }, 2000);
  }

  hide(): void {
    const existingPopup = document.getElementById('tile-info-popup');
    if (existingPopup) {
      existingPopup.remove();
    }
    if (this.popupTimeout !== null) {
      clearTimeout(this.popupTimeout);
      this.popupTimeout = null;
    }
    this.popupTile = null;
  }

  private buildContent(col: number, row: number, tile: Tile, army: Army | undefined): string {
    let content = `<div style="font-family: system-ui, -apple-system, sans-serif; padding: 12px 16px; background: #000; color: #fff; border: 1px solid #fff; max-width: 300px; font-size: 13px; font-weight: 300;">`;
    content += `<div style="font-weight: 400; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; font-size: 12px;">Tile (${col}, ${row})</div>`;
    content += `<div style="margin-bottom: 10px;">Terrain: ${tile.terrainType}</div>`;

    if (army) {
      content += `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #fff;">`;
      content += `<div style="font-weight: 400; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px; font-size: 12px;">Army</div>`;
      content += `<div style="margin-bottom: 4px;">Faction: ${getFactionName(army.faction.color, army.faction.isNeutral, army.faction.id)}</div>`;
      content += `<div style="margin-bottom: 4px;">Units: ${army.units.length}</div>`;
      content += `<div style="margin-bottom: 4px;">From: (${army.sourceBuilding.position.x}, ${army.sourceBuilding.position.y})</div>`;
      content += `<div style="margin-bottom: 4px;">To: (${army.targetBuilding.position.x}, ${army.targetBuilding.position.y})</div>`;

      if (army.units.length > 0) {
        content += `<div style="margin-top: 8px; font-size: 11px; font-weight: 400;">Composition:</div>`;
        const unitCounts = new Map<string, number>();
        for (const unit of army.units) {
          unitCounts.set(unit.type, (unitCounts.get(unit.type) || 0) + 1);
        }
        for (const [type, count] of unitCounts) {
          content += `<div style="font-size: 11px; margin-left: 8px; margin-top: 2px;">- ${count}x ${type}</div>`;
        }
      }

      content += `</div>`;
    }

    if (tile.building) {
      content += `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #fff;">`;
      content += `<div style="font-weight: 400; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px; font-size: 12px;">Building: ${tile.building.type}</div>`;
      content += `<div style="margin-bottom: 4px;">Faction: ${getFactionName(tile.building.faction.color, tile.building.faction.isNeutral, tile.building.faction.id)}</div>`;
      content += `<div style="margin-bottom: 4px;">Defense: ${tile.building.defenseMultiplier}x</div>`;
      content += `<div style="margin-bottom: 4px;">Garrison: ${tile.building.garrison.length}/${tile.building.capacity}</div>`;

      if (tile.building.garrison.length > 0) {
        content += `<div style="margin-top: 8px; font-size: 11px; font-weight: 400;">Units:</div>`;
        const unitCounts = new Map<string, number>();
        for (const unit of tile.building.garrison) {
          unitCounts.set(unit.type, (unitCounts.get(unit.type) || 0) + 1);
        }
        for (const [type, count] of unitCounts) {
          content += `<div style="font-size: 11px; margin-left: 8px; margin-top: 2px;">- ${count}x ${type}</div>`;
        }
      }

      content += `</div>`;
    }

    content += `</div>`;
    return content;
  }
}

