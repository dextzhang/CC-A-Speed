const router = {
  outlet: null,
  backButton: null,
  eyebrowEl: null,
  titleEl: null,
  currentTool: null,

  init() {
    this.outlet = document.querySelector('#routerOutlet');
    this.backButton = document.querySelector('#backButton');
    this.eyebrowEl = document.querySelector('#topbarEyebrow');
    this.titleEl = document.querySelector('#topbarTitle');

    this.backButton.addEventListener('click', () => {
      location.hash = '#/';
    });

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
    this.eyebrowEl.textContent = 'Personal Toolbox';
    this.titleEl.textContent = 'CC 工具箱';

    const cards = CCToolbox.tools.map(tool => `
      <div class="tool-card" style="--card-accent: ${tool.color}" data-tool-id="${tool.id}">
        <div class="tool-card-icon">${tool.icon}</div>
        <div class="tool-card-name">${tool.name}</div>
        <div class="tool-card-desc">${tool.description}</div>
        <div class="tool-card-arrow">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>
    `).join('');

    this.outlet.innerHTML = `
      <p class="home-intro">轻量安卓工具箱，本地优先，按需同步。点击卡片进入工具。</p>
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
