import * as PIXI from 'pixi.js';
import type { WorldGrid } from '../world/terrain';
import { TERRAIN_INFO } from '../world/terrain';
import { drawHexagon, hexToPixel } from '../utils/hexUtils';
import {
  MINIMAP_WIDTH,
  MINIMAP_OVERLAY_COLOR,
  MINIMAP_OVERLAY_ALPHA,
  MINIMAP_BORDER_COLOR,
} from '../constants';

export class Minimap {
  private app: PIXI.Application | null = null;
  private container: PIXI.Container;
  private viewportRect: PIXI.Graphics;
  private hoverRect: PIXI.Graphics;
  private mapWidth: number = 0;
  private mapHeight: number = 0;
  private zoomLevel: number = 1;
  private viewportChangeCallback: ((x: number, y: number) => void) | null = null;

  constructor() {
    this.container = new PIXI.Container();
    this.viewportRect = new PIXI.Graphics();
    this.hoverRect = new PIXI.Graphics();
  }

  async init(parentContainer: HTMLElement): Promise<void> {
    const minimapDiv = document.createElement('div');
    minimapDiv.id = 'minimap';
    parentContainer.appendChild(minimapDiv);

    this.app = new PIXI.Application();
    await this.app.init({
      width: MINIMAP_WIDTH,
      height: 100, // Will be resized later based on actual map aspect ratio
      backgroundColor: 0x1a1a1a,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    // Prevent ticker from stopping when window loses focus
    this.app.ticker.autoStart = true;
    this.app.ticker.stop = () => {}; // Override stop to prevent pausing

    minimapDiv.appendChild(this.app.canvas);
    this.app.stage.addChild(this.container);
    this.app.stage.addChild(this.hoverRect);
    this.app.stage.addChild(this.viewportRect);

    // Hide cursor when hovering over minimap
    this.app.canvas.style.cursor = 'none';

    this.setupInteraction();
  }

  private setupInteraction(): void {
    if (!this.app) return;

    let isDragging = false;

    const updateViewportFromMinimap = (e: MouseEvent) => {
      if (!this.app || !this.viewportChangeCallback) return;

      const rect = this.app.canvas.getBoundingClientRect();
      const minimapX = e.clientX - rect.left;
      const minimapY = e.clientY - rect.top;

      // Convert minimap coordinates to world coordinates
      const minimapWidth = this.app.renderer.width;
      const scale = this.mapWidth / minimapWidth;

      // Center the viewport on the clicked position
      const worldX = minimapX * scale;
      const worldY = minimapY * scale;

      let newX = -worldX * this.zoomLevel + window.innerWidth / 2;
      let newY = -worldY * this.zoomLevel + window.innerHeight / 2;

      // Clamp position
      const scaledWidth = this.mapWidth * this.zoomLevel;
      const scaledHeight = this.mapHeight * this.zoomLevel;
      newX = Math.min(0, Math.max(window.innerWidth - scaledWidth, newX));
      newY = Math.min(0, Math.max(window.innerHeight - scaledHeight, newY));

      this.viewportChangeCallback(newX, newY);
    };

    this.app.canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      this.hoverRect.clear();
      updateViewportFromMinimap(e);
    });

    this.app.canvas.addEventListener('mousemove', (e) => {
      if (isDragging) {
        updateViewportFromMinimap(e);
        this.hoverRect.clear();
      } else {
        this.showHoverPreview(e);
      }
    });

    this.app.canvas.addEventListener('mouseleave', () => {
      this.hoverRect.clear();
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  private showHoverPreview(e: MouseEvent): void {
    if (!this.app) return;

    const rect = this.app.canvas.getBoundingClientRect();
    const minimapX = e.clientX - rect.left;
    const minimapY = e.clientY - rect.top;

    const minimapWidth = this.app.renderer.width;
    const minimapHeight = this.app.renderer.height;
    const scale = minimapWidth / this.mapWidth;

    const viewportWidth = (window.innerWidth / this.zoomLevel) * scale;
    const viewportHeight = (window.innerHeight / this.zoomLevel) * scale;

    // Center the preview on mouse position
    let previewX = minimapX - viewportWidth / 2;
    let previewY = minimapY - viewportHeight / 2;

    // Clamp to minimap bounds
    previewX = Math.max(0, Math.min(minimapWidth - viewportWidth, previewX));
    previewY = Math.max(0, Math.min(minimapHeight - viewportHeight, previewY));

    this.hoverRect.clear();
    this.hoverRect.rect(previewX, previewY, viewportWidth, viewportHeight);
    this.hoverRect.fill({ color: MINIMAP_OVERLAY_COLOR, alpha: MINIMAP_OVERLAY_ALPHA });
    this.hoverRect.stroke({ width: 1, color: MINIMAP_BORDER_COLOR });
  }

  updateViewport(worldX: number, worldY: number, zoomLevel: number, mapWidth: number, mapHeight: number): void {
    if (!this.app) return;

    this.zoomLevel = zoomLevel;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;

    const minimapWidth = this.app.renderer.width;
    const scale = minimapWidth / this.mapWidth;

    const viewportX = -worldX / this.zoomLevel * scale;
    const viewportY = -worldY / this.zoomLevel * scale;
    const viewportWidth = (window.innerWidth / this.zoomLevel) * scale;
    const viewportHeight = (window.innerHeight / this.zoomLevel) * scale;

    this.viewportRect.clear();
    this.viewportRect.rect(viewportX, viewportY, viewportWidth, viewportHeight);
    this.viewportRect.fill({ color: MINIMAP_OVERLAY_COLOR, alpha: MINIMAP_OVERLAY_ALPHA });
    this.viewportRect.stroke({ width: 1, color: MINIMAP_BORDER_COLOR });
  }

  resize(mapWidth: number, mapHeight: number): void {
    if (!this.app) return;

    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;

    const mapAspectRatio = mapWidth / mapHeight;
    const minimapWidth = MINIMAP_WIDTH;
    const minimapHeight = minimapWidth / mapAspectRatio;

    this.app.renderer.resize(minimapWidth, minimapHeight);
  }

  render(world: WorldGrid, hexRadius: number, hexWidth: number, cols: number, rows: number): void {
    if (!this.app) return;

    // Clear existing graphics without removing children
    for (const child of this.container.children) {
      (child as PIXI.Graphics).clear();
    }

    const minimapWidth = this.app.renderer.width;
    const minimapScale = minimapWidth / this.mapWidth;
    const minimapHexRadius = hexRadius * minimapScale;

    let graphicsIndex = 0;
    const getGraphics = (): PIXI.Graphics => {
      if (graphicsIndex < this.container.children.length) {
        return this.container.children[graphicsIndex++] as PIXI.Graphics;
      }
      const g = new PIXI.Graphics();
      this.container.addChild(g);
      graphicsIndex++;
      return g;
    };

    // Render terrain tiles
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const tile = world[row][col];
        const minimapTile = getGraphics();

        const { x, y } = hexToPixel(col, row, hexRadius, hexWidth);
        const minimapX = x * minimapScale;
        const minimapY = y * minimapScale;

        const color = TERRAIN_INFO[tile.terrainType].color;
        drawHexagon(minimapTile, minimapX, minimapY, minimapHexRadius);
        minimapTile.fill(color);
      }
    }

    // Render buildings on minimap
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const tile = world[row][col];

        if (tile.building) {
          const { x, y } = hexToPixel(col, row, hexRadius, hexWidth);
          const minimapX = x * minimapScale;
          const minimapY = y * minimapScale;

          const marker = getGraphics();
          const color = tile.building.faction.color;

          if (tile.building.type === 'capital') {
            // Capital: larger colored circle
            marker.circle(minimapX, minimapY, hexRadius * minimapScale * 3.5);
            marker.fill(color);
            marker.stroke({ width: hexRadius * minimapScale * 0.8, color: 0xffffff });
          } else {
            // All other buildings: medium colored circles
            marker.circle(minimapX, minimapY, hexRadius * minimapScale * 2.5);
            marker.fill(color);
            marker.stroke({ width: hexRadius * minimapScale * 0.6, color: 0xffffff });
          }
        }
      }
    }
  }


  onViewportChange(callback: (x: number, y: number) => void): void {
    this.viewportChangeCallback = callback;
  }
}
