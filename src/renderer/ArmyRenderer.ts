import * as PIXI from 'pixi.js';
import type { Army } from '../armies/Army';
import { hexToPixel } from '../utils/hexUtils';

export class ArmyRenderer {
  private hexRadius: number;
  private hexWidth: number;
  private unitTextures: Map<string, PIXI.Texture>;

  constructor(hexRadius: number, hexWidth: number, unitTextures: Map<string, PIXI.Texture>) {
    this.hexRadius = hexRadius;
    this.hexWidth = hexWidth;
    this.unitTextures = unitTextures;
  }

  renderPaths(armies: Army[], graphics: PIXI.Graphics): void {
    for (const army of armies) {
      if (army.path.length > 1) {
        const start = hexToPixel(army.path[0].x, army.path[0].y, this.hexRadius, this.hexWidth);
        graphics.moveTo(start.x, start.y);

        for (let i = 1; i < army.path.length; i++) {
          const p = hexToPixel(army.path[i].x, army.path[i].y, this.hexRadius, this.hexWidth);
          graphics.lineTo(p.x, p.y);
        }
      }

      const current = hexToPixel(army.position.x, army.position.y, this.hexRadius, this.hexWidth);
      const target = hexToPixel(army.targetPosition.x, army.targetPosition.y, this.hexRadius, this.hexWidth);

      graphics.moveTo(current.x, current.y);
      graphics.lineTo(target.x, target.y);
    }

    graphics.stroke({ width: 2, color: 0xFFFFFF, alpha: 0.3 });
  }

  renderSprites(armies: Army[], container: PIXI.Container, getGraphics: () => PIXI.Graphics): void {
    let spriteIndex = 0;
    for (const army of armies) {
      const { x, y } = hexToPixel(army.position.x, army.position.y, this.hexRadius, this.hexWidth);

      const unitType = army.mostCommonUnitType;
      const texture = this.unitTextures.get(unitType);

      if (texture) {
        let sprite: PIXI.Sprite | null = null;
        for (let i = 0; i < container.children.length; i++) {
          const child = container.children[i];
          if (child instanceof PIXI.Sprite && !child.visible) {
            sprite = child;
            break;
          }
        }

        if (!sprite) {
          sprite = new PIXI.Sprite(texture);
          container.addChild(sprite);
          sprite.anchor.set(0.5);
        }

        sprite.texture = texture;
        const scale = (this.hexRadius * 1.0) / 32;
        sprite.scale.set(scale);
        sprite.position.set(x, y);
        sprite.tint = 0xFFFFFF;
        sprite.visible = true;

        const border = getGraphics();
        this.drawHexagon(border, x, y, this.hexRadius);
        border.stroke({ width: 1, color: army.faction.color });
        spriteIndex++;
      }
    }
  }

  private drawHexagon(graphics: PIXI.Graphics, x: number, y: number, size: number): void {
    const points: number[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i + Math.PI / 6;
      points.push(x + size * Math.cos(angle));
      points.push(y + size * Math.sin(angle));
    }
    graphics.poly(points);
  }
}

