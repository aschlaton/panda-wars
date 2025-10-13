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
  private currentState: GameState | null = null;
  private highlightGraphics: PIXI.Graphics | null = null;
  private hoveredTile: { col: number; row: number } | null = null;

  constructor() {
    this.app = new PIXI.Application();
    this.worldContainer = new PIXI.Container();
    this.terrainContainer = new PIXI.Container();
    this.dynamicContainer = new PIXI.Container();
    this.highlightGraphics = new PIXI.Graphics();
    this.worldContainer.addChild(this.terrainContainer);
    this.worldContainer.addChild(this.dynamicContainer);
    this.worldContainer.addChild(this.highlightGraphics);
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
      preference: 'webgl',
      premultipliedAlpha: true,
    });

    // Prevent ticker from stopping when window loses focus
    this.app.ticker.autoStart = true;
    this.app.ticker.stop = () => {}; // Override stop to prevent pausing

    this.app.canvas.id = 'game-container';
    container.appendChild(this.app.canvas);
    this.app.stage.addChild(this.worldContainer);

    // Handle window resize
    window.addEventListener('resize', () => {
      this.onResize();
    });

    // Handle clicks on the canvas to show tile info
    this.app.canvas.addEventListener('click', (e) => {
      this.onCanvasClick(e);
    });

    // Handle mouse move for hover highlight
    this.app.canvas.addEventListener('mousemove', (e) => {
      this.onCanvasHover(e);
    });

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
    // Just clear children visually, don't destroy graphics objects
    for (const child of this.dynamicContainer.children) {
      (child as PIXI.Graphics).clear();
    }

    let graphicsIndex = 0;
    const getGraphics = (): PIXI.Graphics => {
      if (graphicsIndex < this.dynamicContainer.children.length) {
        return this.dynamicContainer.children[graphicsIndex++] as PIXI.Graphics;
      }
      const g = new PIXI.Graphics();
      this.dynamicContainer.addChild(g);
      graphicsIndex++;
      return g;
    };

    // Render all buildings from faction sets (optimized - no map scan)
    for (const faction of state.factions) {
      for (const buildingData of faction.buildings) {
        const col = buildingData.position.x;
        const row = buildingData.position.y;
        const x = col * this.hexWidth + (row % 2) * (this.hexWidth / 2) + this.hexWidth / 2;
        const y = row * (this.hexRadius * 1.5) + this.hexRadius;

        const building = getGraphics();
        const buildingColor = buildingData.faction.color;

        if (buildingData.type === 'capital') {
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
          } else if (buildingData.type === 'barracks') {
            // Barracks: square
            const size = this.hexRadius * 0.5;
            building.rect(x - size / 2, y - size / 2, size, size);
            building.fill(buildingColor);
            building.stroke({ width: this.hexRadius * 0.08, color: 0xffffff });
          } else if (buildingData.type === 'archery_range') {
            // Archery Range: triangle
            const size = this.hexRadius * 0.6;
            building.poly([
              x, y - size / 2,
              x + size / 2, y + size / 2,
              x - size / 2, y + size / 2
            ]);
            building.fill(buildingColor);
            building.stroke({ width: this.hexRadius * 0.08, color: 0xffffff });
          } else if (buildingData.type === 'monastery') {
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
          } else if (buildingData.type === 'farm') {
            // Farm: small square
            const size = this.hexRadius * 0.4;
            building.rect(x - size / 2, y - size / 2, size, size);
            building.fill(buildingColor);
            building.stroke({ width: this.hexRadius * 0.08, color: 0xffffff });
          }

      }
    }

    // Render all armies (use single graphics object for all paths to reduce draw calls)
    const pathsGraphics = getGraphics();

    for (const army of state.armies) {
      // Draw traversed path
      if (army.path.length > 1) {
        pathsGraphics.moveTo(
          army.path[0].x * this.hexWidth + (army.path[0].y % 2) * (this.hexWidth / 2) + this.hexWidth / 2,
          army.path[0].y * (this.hexRadius * 1.5) + this.hexRadius
        );

        for (let i = 1; i < army.path.length; i++) {
          const px = army.path[i].x * this.hexWidth + (army.path[i].y % 2) * (this.hexWidth / 2) + this.hexWidth / 2;
          const py = army.path[i].y * (this.hexRadius * 1.5) + this.hexRadius;
          pathsGraphics.lineTo(px, py);
        }
      }

      // Draw planned route (straight line from current to target)
      const currentX = army.position.x * this.hexWidth + (army.position.y % 2) * (this.hexWidth / 2) + this.hexWidth / 2;
      const currentY = army.position.y * (this.hexRadius * 1.5) + this.hexRadius;
      const targetX = army.targetPosition.x * this.hexWidth + (army.targetPosition.y % 2) * (this.hexWidth / 2) + this.hexWidth / 2;
      const targetY = army.targetPosition.y * (this.hexRadius * 1.5) + this.hexRadius;

      pathsGraphics.moveTo(currentX, currentY);
      pathsGraphics.lineTo(targetX, targetY);
    }

    pathsGraphics.stroke({ width: 2, color: 0xFFFFFF, alpha: 0.3 });

    // Draw army circles
    for (const army of state.armies) {
      const col = army.position.x;
      const row = army.position.y;
      const x = col * this.hexWidth + (row % 2) * (this.hexWidth / 2) + this.hexWidth / 2;
      const y = row * (this.hexRadius * 1.5) + this.hexRadius;

      const armyGraphics = getGraphics();
      const armyColor = army.faction.color;

      const armyRadius = this.hexRadius * 0.5;
      armyGraphics.circle(x, y, armyRadius);
      armyGraphics.fill(armyColor);
      armyGraphics.stroke({ width: this.hexRadius * 0.08, color: 0xffffff });
    }

    // Hide unused graphics objects
    while (graphicsIndex < this.dynamicContainer.children.length) {
      this.dynamicContainer.children[graphicsIndex++].visible = false;
    }
    // Show used ones
    for (let i = 0; i < graphicsIndex; i++) {
      this.dynamicContainer.children[i].visible = true;
    }
  }

  render(state: GameState): void {
    if (!state.world) return;

    // Store current state for click handling
    this.currentState = state;

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

  public refreshMinimap(state: GameState): void {
    if (!state.world) return;
    if (this.hexRadius <= 0 || this.hexWidth <= 0) return;
    this.minimap.render(state.world, this.hexRadius, this.hexWidth, state.mapWidth, state.mapHeight);
    this.minimap.updateViewport(this.worldContainer.x, this.worldContainer.y, this.zoomLevel, this.mapWidth, this.mapHeight);
  }

  public resetForNewWorld(): void {
    // Clear existing terrain and dynamic layers and reset sizing flags
    this.terrainContainer.removeChildren();
    this.dynamicContainer.removeChildren();

    this.terrainRendered = false;
    this.hexRadius = 0;
    this.hexWidth = 0;
    this.mapWidth = 0;
    this.mapHeight = 0;

    // Reset camera/zoom
    this.zoomLevel = MIN_ZOOM;
    this.worldContainer.scale.set(this.zoomLevel);
    this.worldContainer.x = 0;
    this.worldContainer.y = 0;
  }

  private onResize(): void {
    // Update minimap viewport when window resizes
    this.minimap.updateViewport(this.worldContainer.x, this.worldContainer.y, this.zoomLevel, this.mapWidth, this.mapHeight);
  }

  private screenToHexCoords(screenX: number, screenY: number): { col: number; row: number } | null {
    if (!this.currentState || !this.currentState.world) return null;

    // Convert screen coordinates to world coordinates
    const worldX = (screenX - this.worldContainer.x) / this.zoomLevel;
    const worldY = (screenY - this.worldContainer.y) / this.zoomLevel;

    // Convert world coordinates to hex grid coordinates using axial offset
    const row = Math.round((worldY - this.hexRadius) / (this.hexRadius * 1.5));
    const col = Math.round((worldX - this.hexWidth / 2 - (row % 2) * (this.hexWidth / 2)) / this.hexWidth);

    // Check bounds
    if (col < 0 || col >= this.currentState.mapWidth || row < 0 || row >= this.currentState.mapHeight) {
      return null;
    }

    return { col, row };
  }

  private onCanvasHover(e: MouseEvent): void {
    const coords = this.screenToHexCoords(e.clientX, e.clientY);

    if (!coords) {
      // Clear highlight
      if (this.hoveredTile) {
        this.hoveredTile = null;
        this.highlightGraphics?.clear();
      }
      return;
    }

    // Check if hovering different tile
    if (!this.hoveredTile || this.hoveredTile.col !== coords.col || this.hoveredTile.row !== coords.row) {
      this.hoveredTile = coords;
      this.drawHighlight(coords.col, coords.row);
    }
  }

  private drawHighlight(col: number, row: number): void {
    if (!this.highlightGraphics) return;

    this.highlightGraphics.clear();

    const x = col * this.hexWidth + (row % 2) * (this.hexWidth / 2) + this.hexWidth / 2;
    const y = row * (this.hexRadius * 1.5) + this.hexRadius;

    this.drawHexagon(this.highlightGraphics, x, y, this.hexRadius);
    this.highlightGraphics.stroke({ width: 2, color: 0xFFFFFF, alpha: 0.5 });
  }

  private onCanvasClick(e: MouseEvent): void {
    const coords = this.screenToHexCoords(e.clientX, e.clientY);
    if (!coords || !this.currentState?.world) return;

    const { col, row } = coords;
    const tile = this.currentState.world[row][col];

    // Build popup content
    let content = `<div style="font-family: monospace; padding: 10px; background: rgba(0,0,0,0.9); color: white; border: 2px solid #fff; border-radius: 5px; max-width: 300px;">`;
    content += `<div style="font-weight: bold; margin-bottom: 8px;">Tile (${col}, ${row})</div>`;
    content += `<div style="margin-bottom: 8px;">Terrain: ${tile.terrainType}</div>`;

    if (tile.building) {
      content += `<div style="margin-bottom: 8px; padding-top: 8px; border-top: 1px solid #666;">`;
      content += `<div style="font-weight: bold;">Building: ${tile.building.type}</div>`;
      content += `<div>Faction: ${tile.building.faction.id}</div>`;
      content += `<div>Defense: ${tile.building.defenseMultiplier}x</div>`;
      content += `<div>Garrison: ${tile.building.garrison.length}/${tile.building.capacity}</div>`;

      if (tile.building.garrison.length > 0) {
        content += `<div style="margin-top: 4px; font-size: 11px;">Units:</div>`;
        const unitCounts = new Map<string, number>();
        for (const unit of tile.building.garrison) {
          unitCounts.set(unit.type, (unitCounts.get(unit.type) || 0) + 1);
        }
        for (const [type, count] of unitCounts) {
          content += `<div style="font-size: 11px; margin-left: 8px;">- ${count}x ${type}</div>`;
        }
      }

      content += `</div>`;
    }

    content += `</div>`;

    // Remove any existing popup
    const existingPopup = document.getElementById('tile-info-popup');
    if (existingPopup) {
      existingPopup.remove();
    }

    // Create and show popup
    const popup = document.createElement('div');
    popup.id = 'tile-info-popup';
    popup.innerHTML = content;
    popup.style.position = 'absolute';
    popup.style.left = `${e.clientX + 10}px`;
    popup.style.top = `${e.clientY + 10}px`;
    popup.style.zIndex = '1000';
    popup.style.pointerEvents = 'none';

    document.body.appendChild(popup);

    // Auto-hide after 3 seconds
    setTimeout(() => {
      popup.remove();
    }, 3000);
  }
}
