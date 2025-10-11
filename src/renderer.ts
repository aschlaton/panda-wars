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
  private zoomLevel: number = MIN_ZOOM;
  private mapWidth: number = 0;
  private mapHeight: number = 0;
  private minimap: Minimap;
  private targetX: number = 0;
  private targetY: number = 0;
  private isTransitioning: boolean = false;

  constructor() {
    this.app = new PIXI.Application();
    this.worldContainer = new PIXI.Container();
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

  render(state: GameState): void {
    if (!state.world) return;

    // Clear previous render
    this.worldContainer.removeChildren();

    // Set initial zoom
    this.worldContainer.scale.set(this.zoomLevel);

    const cols = state.mapWidth;
    const rows = state.mapHeight;

    // Total width = cols*sqrt(3)*radius + 0.5*sqrt(3)*radius
    // Total height = rows*1.5*radius + 0.5*radius

    const widthNeeded = cols * Math.sqrt(3) + 0.5 * Math.sqrt(3); // in terms of radius
    const heightNeeded = rows * 1.5 + 0.5; // in terms of radius

    const hexRadiusForWidth = window.innerWidth / widthNeeded;
    const hexRadiusForHeight = window.innerHeight / heightNeeded;

    const hexRadius = Math.max(hexRadiusForWidth, hexRadiusForHeight) * MAP_SCALE_MULTIPLIER;
    const hexWidth = Math.sqrt(3) * hexRadius;

    this.mapWidth = cols * hexWidth + hexWidth / 2;

    this.mapHeight = rows * hexRadius * 1.5 + hexRadius * 0.5;

    this.minimap.resize(this.mapWidth, this.mapHeight);
    this.minimap.render(state.world, hexRadius, hexWidth, cols, rows, state.players);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const tile = state.world[row][col];
        const graphics = new PIXI.Graphics();

        const x = col * hexWidth + (row % 2) * (hexWidth / 2) + hexWidth / 2;
        const y = row * (hexRadius * 1.5) + hexRadius;

        const color = TERRAIN_INFO[tile.terrainType].color;
        this.drawHexagon(graphics, x, y, hexRadius);
        graphics.fill(color);
        graphics.stroke({ width: HEX_BORDER_WIDTH, color: HEX_BORDER_COLOR });

        this.worldContainer.addChild(graphics);
      }
    }

    // Render buildings
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const tile = state.world[row][col];
        if (!tile.building) continue;

        const x = col * hexWidth + (row % 2) * (hexWidth / 2) + hexWidth / 2;
        const y = row * (hexRadius * 1.5) + hexRadius;

        const building = new PIXI.Graphics();

        if (tile.building.type === 'capital') {
          // Capital: large star
          const player = state.players.find(p => p.id === tile.building!.ownerId);
          const color = player ? player.color : 0xffffff;

          // Draw star
          const points = 5;
          const outerRadius = hexRadius * 0.7;
          const innerRadius = hexRadius * 0.35;
          const starPoints: number[] = [];

          for (let i = 0; i < points * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (Math.PI / points) * i - Math.PI / 2;
            starPoints.push(x + radius * Math.cos(angle));
            starPoints.push(y + radius * Math.sin(angle));
          }

          building.poly(starPoints);
          building.fill(color);
          building.stroke({ width: hexRadius * 0.1, color: 0xffffff });
        } else if (tile.building.type === 'settlement') {
          // Settlement: gray square
          const size = hexRadius * 0.5;
          building.rect(x - size / 2, y - size / 2, size, size);
          building.fill(0xaaaaaa);
          building.stroke({ width: hexRadius * 0.08, color: 0x666666 });
        }

        this.worldContainer.addChild(building);
      }
    }

    // Initial minimap viewport update
    this.minimap.updateViewport(this.worldContainer.x, this.worldContainer.y, this.zoomLevel, this.mapWidth, this.mapHeight);
  }
}
