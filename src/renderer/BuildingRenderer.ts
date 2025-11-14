import * as PIXI from 'pixi.js';
import type { Building } from '../buildings/Building';
import { hexToPixel } from '../utils/hexUtils';

export class BuildingRenderer {
  private hexRadius: number;
  private hexWidth: number;

  constructor(hexRadius: number, hexWidth: number) {
    this.hexRadius = hexRadius;
    this.hexWidth = hexWidth;
  }

  render(building: Building, graphics: PIXI.Graphics): void {
    const { x, y } = hexToPixel(building.position.x, building.position.y, this.hexRadius, this.hexWidth);
    const buildingColor = building.faction.color;

    if (building.type === 'capital') {
      const points = 5;
      const outerRadius = this.hexRadius * 0.7;
      const innerRadius = this.hexRadius * 0.35;
      const starPoints: number[] = [];

      for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (Math.PI / points) * i - Math.PI / 2;
        starPoints.push(x + radius * Math.cos(angle));
        starPoints.push(y + radius * Math.sin(angle));
      }

      graphics.poly(starPoints);
      graphics.fill(buildingColor);
      graphics.stroke({ width: this.hexRadius * 0.1, color: 0xffffff });
    } else if (building.type === 'barracks') {
      const size = this.hexRadius * 0.5;
      graphics.rect(x - size / 2, y - size / 2, size, size);
      graphics.fill(buildingColor);
      graphics.stroke({ width: this.hexRadius * 0.08, color: 0xffffff });
    } else if (building.type === 'archery_range') {
      const size = this.hexRadius * 0.6;
      graphics.poly([
        x, y - size / 2,
        x + size / 2, y + size / 2,
        x - size / 2, y + size / 2
      ]);
      graphics.fill(buildingColor);
      graphics.stroke({ width: this.hexRadius * 0.08, color: 0xffffff });
    } else if (building.type === 'monastery') {
      const size = this.hexRadius * 0.5;
      graphics.poly([
        x, y - size,
        x + size, y,
        x, y + size,
        x - size, y
      ]);
      graphics.fill(buildingColor);
      graphics.stroke({ width: this.hexRadius * 0.08, color: 0xffffff });
    } else if (building.type === 'farm') {
      const size = this.hexRadius * 0.4;
      graphics.rect(x - size / 2, y - size / 2, size, size);
      graphics.fill(buildingColor);
      graphics.stroke({ width: this.hexRadius * 0.08, color: 0xffffff });
    }
  }
}

