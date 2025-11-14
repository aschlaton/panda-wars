import * as PIXI from 'pixi.js';
import type { Army } from '../armies/Army';

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
        graphics.moveTo(
          army.path[0].x * this.hexWidth + (army.path[0].y % 2) * (this.hexWidth / 2) + this.hexWidth / 2,
          army.path[0].y * (this.hexRadius * 1.5) + this.hexRadius
        );

        for (let i = 1; i < army.path.length; i++) {
          const px = army.path[i].x * this.hexWidth + (army.path[i].y % 2) * (this.hexWidth / 2) + this.hexWidth / 2;
          const py = army.path[i].y * (this.hexRadius * 1.5) + this.hexRadius;
          graphics.lineTo(px, py);
        }
      }

      const currentX = army.position.x * this.hexWidth + (army.position.y % 2) * (this.hexWidth / 2) + this.hexWidth / 2;
      const currentY = army.position.y * (this.hexRadius * 1.5) + this.hexRadius;
      const targetX = army.targetPosition.x * this.hexWidth + (army.targetPosition.y % 2) * (this.hexWidth / 2) + this.hexWidth / 2;
      const targetY = army.targetPosition.y * (this.hexRadius * 1.5) + this.hexRadius;

      graphics.moveTo(currentX, currentY);
      graphics.lineTo(targetX, targetY);
    }

    graphics.stroke({ width: 2, color: 0xFFFFFF, alpha: 0.3 });
  }

  renderSprites(armies: Army[], container: PIXI.Container, getGraphics: () => PIXI.Graphics): void {
    let spriteIndex = 0;
    for (const army of armies) {
      const col = army.position.x;
      const row = army.position.y;
      const x = col * this.hexWidth + (row % 2) * (this.hexWidth / 2) + this.hexWidth / 2;
      const y = row * (this.hexRadius * 1.5) + this.hexRadius;

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

