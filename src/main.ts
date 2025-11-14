import './styles/main.css';
import { Renderer } from './renderer';
import { Game } from './game';
import { createMenu } from './ui/menu';
import { DEFAULT_GAME_SPEED } from './constants';

async function init() {
  const appContainer = document.querySelector<HTMLDivElement>('#app')!;
  appContainer.innerHTML = '';

  // Initialize renderer
  const renderer = new Renderer();
  await renderer.init(appContainer);

  // Initialize game
  const game = new Game(renderer);

  // Create hamburger menu
  const menu = createMenu(appContainer, () => game.getStats());
  menu.updateStats(game.getStats());
  menu.addMenuItem('Generate World', () => {
    game.generateWorld();
    menu.updateStats(game.getStats());
  });

  // Setup turn controls
  const pauseBtn = document.getElementById('pauseBtn') as HTMLButtonElement;
  const nextTurnBtn = document.getElementById('nextTurnBtn') as HTMLButtonElement;
  const speedSlider = document.getElementById('speedSlider') as HTMLInputElement;
  const speedLabel = document.getElementById('speedLabel') as HTMLSpanElement;

  pauseBtn.addEventListener('click', () => {
    game.togglePause();
    pauseBtn.textContent = game.isPaused() ? 'Resume' : 'Pause';
  });

  nextTurnBtn.addEventListener('click', () => {
    game.nextTurn();
  });

  // Set default speed
  speedSlider.value = DEFAULT_GAME_SPEED.toString();
  speedLabel.textContent = `${DEFAULT_GAME_SPEED.toFixed(1)}x`;
  game.setTurnSpeed(Math.round(60 / DEFAULT_GAME_SPEED));

  speedSlider.addEventListener('input', () => {
    const speed = parseFloat(speedSlider.value);
    const frames = Math.round(60 / speed);
    game.setTurnSpeed(frames);
    speedLabel.textContent = `${speed.toFixed(1)}x`;
  });

  // Initialize game state (generates world)
  game.init();

  // Start game loop
  game.start();
}

init();
