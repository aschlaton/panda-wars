import * as PIXI from 'pixi.js';
import type { GameState } from './types';
import { TERRAIN_INFO } from './world/terrain';
import { Minimap } from './ui/Minimap';
import {
  MIN_ZOOM,
  MAX_ZOOM,
  TRANSITION_SPEED,
  TRANSITION_THRESHOLD,
  MAP_SCALE_MULTIPLIER,
  HEX_BORDER_WIDTH,
  HEX_BORDER_COLOR,
} from './constants';

export class Renderer {
  public app: PIXI.Application;
  private worldContainer: PIXI.Container;
  private terrainContainer: PIXI.Container;
  private dynamicContainer: PIXI.Container;
  private zoomLevel: number = MIN_ZOOM;
  private mapWidth: number = 0;
  private mapHeight: number = 0;
  private minimap: Minimap;
  private targetX: number = 0;
  private targetY: number = 0;
  private isTransitioning: boolean = false;
  private hexRadius: number = 0;
  private hexWidth: number = 0;
  private terrainRendered: boolean = false;

  constructor() {
    this.app = new PIXI.Application();
    this.worldContainer = new PIXI.Container();
    this.terrainContainer = new PIXI.Container();
    this.dynamicContainer = new PIXI.Container();
    this.worldContainer.addChild(this.terrainContainer);
    this.worldContainer.addChild(this.dynamicContainer);
    this.minimap = new Minimap();
  }

  async init(container: HTMLElement): Promise<void> {
    await this.app.init({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x2c3e50,
      resizeTo: window,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    this.app.canvas.id = 'game-container';
    container.appendChild(this.app.canvas);
    this.app.stage.addChild(this.worldContainer);

    // Prevent browser zoom
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=')) {
        e.preventDefault();
      }
    });

    document.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    }, { passive: false });

    // Enable zooming with mouse wheel
    this.app.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();

      this.isTransitioning = false;

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      const worldXBefore = (centerX - this.worldContainer.x) / this.zoomLevel;
      const worldYBefore = (centerY - this.worldContainer.y) / this.zoomLevel;

      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const oldZoom = this.zoomLevel;
      this.zoomLevel *= delta;
      this.zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.zoomLevel));

      if (this.zoomLevel !== oldZoom) {
        this.worldContainer.scale.set(this.zoomLevel);

        this.worldContainer.x = centerX - worldXBefore * this.zoomLevel;
        this.worldContainer.y = centerY - worldYBefore * this.zoomLevel;

        const scaledWidth = this.mapWidth * this.zoomLevel;
        const scaledHeight = this.mapHeight * this.zoomLevel;
        this.worldContainer.x = Math.min(0, Math.max(window.innerWidth - scaledWidth, this.worldContainer.x));
        this.worldContainer.y = Math.min(0, Math.max(window.innerHeight - scaledHeight, this.worldContainer.y));

        this.minimap.updateViewport(this.worldContainer.x, this.worldContainer.y, this.zoomLevel, this.mapWidth, this.mapHeight);
      }
      
    });

    // Enable panning with mouse drag
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };

    const clampPosition = () => {
      const scaledWidth = this.mapWidth * this.zoomLevel;
      const scaledHeight = this.mapHeight * this.zoomLevel;

      // Don't allow panning beyond the map edges
      this.worldContainer.x = Math.min(0, Math.max(window.innerWidth - scaledWidth, this.worldContainer.x));
      this.worldContainer.y = Math.min(0, Math.max(window.innerHeight - scaledHeight, this.worldContainer.y));
    };

    this.app.canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      this.isTransitioning = false; // Stop any ongoing transitions
      dragStart = { x: e.clientX - this.worldContainer.x, y: e.clientY - this.worldContainer.y };
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        this.worldContainer.x = e.clientX - dragStart.x;
        this.worldContainer.y = e.clientY - dragStart.y;
        clampPosition();
        this.minimap.updateViewport(this.worldContainer.x, this.worldContainer.y, this.zoomLevel, this.mapWidth, this.mapHeight);
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });

    // Initialize minimap
    await this.minimap.init(container);
    this.minimap.onViewportChange((x, y) => {
      this.targetX = x;
      this.targetY = y;
      this.isTransitioning = true;
    });

    // Set up transition animation
    this.app.ticker.add(() => {
      if (this.isTransitioning) {
        const speed = TRANSITION_SPEED;

        // Clamp target position first
        const scaledWidth = this.mapWidth * this.zoomLevel;
        const scaledHeight = this.mapHeight * this.zoomLevel;
        const clampedTargetX = Math.min(0, Math.max(window.innerWidth - scaledWidth, this.targetX));
        const clampedTargetY = Math.min(0, Math.max(window.innerHeight - scaledHeight, this.targetY));

        const dx = clampedTargetX - this.worldContainer.x;
        const dy = clampedTargetY - this.worldContainer.y;

        if (Math.abs(dx) < TRANSITION_THRESHOLD && Math.abs(dy) < TRANSITION_THRESHOLD) {
          this.worldContainer.x = clampedTargetX;
          this.worldContainer.y = clampedTargetY;
          this.isTransitioning = false;
        } else {
          this.worldContainer.x += dx * speed;
          this.worldContainer.y += dy * speed;
        }

        this.minimap.updateViewport(this.worldContainer.x, this.worldContainer.y, this.zoomLevel, this.mapWidth, this.mapHeight);
      }
    });
  }

  private drawHexagon(graphics: PIXI.Graphics, x: number, y: number, size: number): void {
    const points: number[] = [];
    for (let i = 0; i < 6; i++) {
      // Add PI/6 offset for pointy-top hexagons
      const angle = (Math.PI / 3) * i + Math.PI / 6;
      points.push(x + size * Math.cos(angle));
      points.push(y + size * Math.sin(angle));
    }
    graphics.poly(points);
  }

  private renderTerrain(state: GameState): void {
    const cols = state.mapWidth;
    const rows = state.mapHeight;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const tile = state.world![row][col];
        const x = col * this.hexWidth + (row % 2) * (this.hexWidth / 2) + this.hexWidth / 2;
        const y = row * (this.hexRadius * 1.5) + this.hexRadius;

        const terrain = new PIXI.Graphics();
        const color = TERRAIN_INFO[tile.terrainType].color;
        this.drawHexagon(terrain, x, y, this.hexRadius);
        terrain.fill(color);
        terrain.stroke({ width: HEX_BORDER_WIDTH, color: HEX_BORDER_COLOR });
        this.terrainContainer.addChild(terrain);
      }
    }
  }

  private renderDynamic(state: GameState): void {
    // Clear dynamic layer
    this.dynamicContainer.removeChildren();

    const cols = state.mapWidth;
    const rows = state.mapHeight;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const tile = state.world![row][col];
        const x = col * this.hexWidth + (row % 2) * (this.hexWidth / 2) + this.hexWidth / 2;
        const y = row * (this.hexRadius * 1.5) + this.hexRadius;

        // Render building
        if (tile.building) {
          const building = new PIXI.Graphics();
          const buildingColor = tile.building.faction.color;

          if (tile.building.type === 'capital') {
            // Capital: large star
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

            building.poly(starPoints);
            building.fill(buildingColor);
            building.stroke({ width: this.hexRadius * 0.1, color: 0xffffff });
          } else if (tile.building.type === 'barracks') {
            // Barracks: square
            const size = this.hexRadius * 0.5;
            building.rect(x - size / 2, y - size / 2, size, size);
            building.fill(buildingColor);
            building.stroke({ width: this.hexRadius * 0.08, color: 0xffffff });
          } else if (tile.building.type === 'archery_range') {
            // Archery Range: triangle
            const size = this.hexRadius * 0.6;
            building.poly([
              x, y - size / 2,
              x + size / 2, y + size / 2,
              x - size / 2, y + size / 2
            ]);
            building.fill(buildingColor);
            building.stroke({ width: this.hexRadius * 0.08, color: 0xffffff });
          } else if (tile.building.type === 'monastery') {
            // Monastery: diamond
            const size = this.hexRadius * 0.5;
            building.poly([
              x, y - size,
              x + size, y,
              x, y + size,
              x - size, y
            ]);
            building.fill(buildingColor);
            building.stroke({ width: this.hexRadius * 0.08, color: 0xffffff });
          } else if (tile.building.type === 'farm') {
            // Farm: small square
            const size = this.hexRadius * 0.4;
            building.rect(x - size / 2, y - size / 2, size, size);
            building.fill(buildingColor);
            building.stroke({ width: this.hexRadius * 0.08, color: 0xffffff });
          }

          this.dynamicContainer.addChild(building);
        }

        // Render unit
        if (tile.unit) {
          const unit = new PIXI.Graphics();
          const unitColor = tile.unit.faction.color;

          const unitRadius = this.hexRadius * 0.4;
          unit.circle(x, y, unitRadius);
          unit.fill(unitColor);
          unit.stroke({ width: this.hexRadius * 0.06, color: 0xffffff });

          this.dynamicContainer.addChild(unit);
        }
      }
    }
  }

  render(state: GameState): void {
    if (!state.world) return;

    // Calculate hex dimensions if not done yet
    if (!this.terrainRendered) {
      this.worldContainer.scale.set(this.zoomLevel);

      const cols = state.mapWidth;
      const rows = state.mapHeight;

      const widthNeeded = cols * Math.sqrt(3) + 0.5 * Math.sqrt(3);
      const heightNeeded = rows * 1.5 + 0.5;

      const hexRadiusForWidth = window.innerWidth / widthNeeded;
      const hexRadiusForHeight = window.innerHeight / heightNeeded;

      this.hexRadius = Math.max(hexRadiusForWidth, hexRadiusForHeight) * MAP_SCALE_MULTIPLIER;
      this.hexWidth = Math.sqrt(3) * this.hexRadius;

      this.mapWidth = cols * this.hexWidth + this.hexWidth / 2;
      this.mapHeight = rows * this.hexRadius * 1.5 + this.hexRadius * 0.5;

      // Render terrain once
      this.renderTerrain(state);
      this.terrainRendered = true;

      this.minimap.resize(this.mapWidth, this.mapHeight);
      this.minimap.render(state.world, this.hexRadius, this.hexWidth, cols, rows);
      this.minimap.updateViewport(this.worldContainer.x, this.worldContainer.y, this.zoomLevel, this.mapWidth, this.mapHeight);
    }

    // Render dynamic content every frame
    this.renderDynamic(state);
  }
}
