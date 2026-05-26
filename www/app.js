const router = {
  outlet: null,
  backButton: null,
  settingsButton: null,
  eyebrowEl: null,
  titleEl: null,
  currentTool: null,

  init() {
    this.outlet = document.querySelector('#routerOutlet');
    this.backButton = document.querySelector('#backButton');
    this.settingsButton = document.querySelector('#settingsButton');
    this.eyebrowEl = document.querySelector('#topbarEyebrow');
    this.titleEl = document.querySelector('#topbarTitle');

    this.backButton.addEventListener('click', () => {
      location.hash = '#/';
    });

    if (this.settingsButton) {
      this.settingsButton.addEventListener('click', () => {
        location.hash = '#/settings';
      });
    }

    window.addEventListener('hashchange', () => this.resolve());
    this.resolve();
  },

  resolve() {
    const hash = location.hash || '#/';
    const path = hash.replace('#', '');

    if (this.currentTool && typeof this.currentTool.destroy === 'function') {
      this.currentTool.destroy();
    }
    this.currentTool = null;

    if (path === '/' || path === '') {
      this.renderHome();
    } else {
      const toolId = path.replace(/^\//, '');
      const tool = CCToolbox.tools.find(t => t.id === toolId);
      if (tool) {
        this.renderTool(tool);
      } else {
        this.renderHome();
      }
    }
  },

  renderHome() {
    this.backButton.classList.remove('visible');
    if (this.settingsButton) this.settingsButton.style.display = 'flex';
    this.eyebrowEl.textContent = 'Personal Toolbox';
    this.titleEl.textContent = 'CC 工具箱';

    const cards = CCToolbox.tools
      .filter(tool => tool.id !== 'settings')
      .map(tool => `
        <div class="tool-card" style="--card-accent: ${tool.color}" data-tool-id="${tool.id}">
          <div class="tool-card-badge" style="background: ${tool.color}18; color: ${tool.color}">${tool.eyebrow || '小工具'}</div>
          <div class="tool-card-icon-wrapper" style="background: ${tool.color}15; color: ${tool.color}">
            <span class="tool-card-icon">${tool.icon}</span>
          </div>
          <div class="tool-card-info">
            <h3 class="tool-card-name">${tool.name}</h3>
            <p class="tool-card-desc">${tool.description}</p>
          </div>
          <div class="tool-card-arrow">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>
      `).join('');

    this.outlet.innerHTML = `
      <p class="home-intro">轻量级安卓工具箱，本地优先，按需云同步。点击卡片开启使用。</p>
      <div class="tool-grid">${cards}</div>
    `;

    this.outlet.querySelectorAll('.tool-card').forEach(card => {
      card.addEventListener('click', () => {
        location.hash = `#/${card.dataset.toolId}`;
      });
    });
  },

  renderTool(tool) {
    this.currentTool = tool;
    this.backButton.classList.add('visible');
    if (this.settingsButton) this.settingsButton.style.display = 'none';
    this.eyebrowEl.textContent = tool.eyebrow || 'CC 工具箱';
    this.titleEl.textContent = tool.name;

    this.outlet.innerHTML = `<div class="tool-page">${tool.render()}</div>`;

    if (typeof tool.init === 'function') {
      tool.init();
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  router.init();
});
