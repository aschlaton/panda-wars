export function createMenu(container: HTMLElement, getStatsFn?: () => any): {
  addMenuItem: (text: string, onClick: () => void) => void;
  updateStats: (stats: any) => void;
} {
  const menuToggle = document.createElement('button');
  menuToggle.id = 'menu-toggle';
  menuToggle.innerHTML = '<span></span><span></span><span></span>';
  container.appendChild(menuToggle);

  const sideMenu = document.createElement('div');
  sideMenu.id = 'side-menu';
  container.appendChild(sideMenu);

  const statsSection = document.createElement('div');
  statsSection.id = 'menu-stats';
  sideMenu.appendChild(statsSection);

  const menuItemsContainer = document.createElement('div');
  menuItemsContainer.id = 'menu-items';
  sideMenu.appendChild(menuItemsContainer);

  let statsInterval: number | null = null;
  // poll every 0.5 secs
  const startStatsUpdates = () => {
    if (getStatsFn) {
      updateStats(getStatsFn());
      statsInterval = window.setInterval(() => {
        if (sideMenu.classList.contains('open') && getStatsFn) {
          updateStats(getStatsFn());
        }
      }, 500);
    }
  };

  const stopStatsUpdates = () => {
    if (statsInterval !== null) {
      clearInterval(statsInterval);
      statsInterval = null;
    }
  };

  menuToggle.addEventListener('click', () => {
    const wasOpen = sideMenu.classList.contains('open');
    sideMenu.classList.toggle('open');
    const isOpen = sideMenu.classList.contains('open');
    
    if (isOpen && !wasOpen) {
      startStatsUpdates();
    } else if (!isOpen && wasOpen) {
      stopStatsUpdates();
    }
  });

  container.addEventListener('click', (e) => {
    if (!sideMenu.contains(e.target as Node) && !menuToggle.contains(e.target as Node)) {
      sideMenu.classList.remove('open');
      stopStatsUpdates();
    }
  });

  const updateStats = (stats: any) => {
      statsSection.innerHTML = `
        <div class="menu-stats-content">
          <h3>Game Stats</h3>
          <div class="menu-stat-item">
            <span class="stat-label">Factions:</span>
            <span class="stat-value">${stats.activeFactions}/${stats.totalFactions}</span>
          </div>
          <div class="menu-stat-item">
            <span class="stat-label">Buildings:</span>
            <span class="stat-value">${stats.totalBuildings}</span>
          </div>
          <div class="menu-stat-item">
            <span class="stat-label">Units:</span>
            <span class="stat-value">${stats.totalUnits}</span>
          </div>
          ${stats.factions.length > 0 ? `
            <div class="menu-factions">
              ${stats.factions.map((f: any) => `
                <div class="menu-faction-item">
                  <span class="faction-color" style="background: ${f.color}"></span>
                  <span>${f.name}: ${f.units} units, ${f.buildings} buildings</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
  };

  return {
    addMenuItem: (text: string, onClick: () => void) => {
      const button = document.createElement('button');
      button.textContent = text;
      button.addEventListener('click', () => {
        onClick();
        sideMenu.classList.remove('open');
      });
      menuItemsContainer.appendChild(button);
    },
    updateStats,
  };
}
