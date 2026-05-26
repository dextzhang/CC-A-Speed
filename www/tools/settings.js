CCToolbox.register({
  id: 'settings',
  name: '全局云端配置',
  eyebrow: 'Global Cloud Settings',
  icon: '⚙️',
  description: '统一管理坚果云 WebDAV、Gitee 和 GitHub 账号授权',
  color: '#475569',

  render() {
    return `
      <div class="settings-container">
        <div class="tab-header">
          <button class="tab-btn active" data-tab="webdav" type="button">坚果云 WebDAV</button>
          <button class="tab-btn" data-tab="gitee" type="button">Gitee 同步</button>
          <button class="tab-btn" data-tab="github" type="button">GitHub 备份</button>
        </div>

        <section class="tab-pane active" id="pane-webdav" aria-label="坚果云配置">
          <div class="panel-soft">
            <h3 class="panel-title">坚果云 WebDAV 配置</h3>
            <p class="panel-tip">坚果云默认基础地址为：https://dav.jianguoyun.com/dav</p>
            <div class="form-grid">
              <label class="wide-field">
                WebDAV 基础地址
                <input id="set-webdavUrl" type="url" placeholder="https://dav.jianguoyun.com/dav">
              </label>
              <label class="wide-field">
                账号（邮箱）
                <input id="set-webdavUser" type="email" placeholder="输入坚果云注册邮箱">
              </label>
              <label class="wide-field">
                应用密码 (非登录密码)
                <input id="set-webdavPass" type="password" placeholder="第三方应用密码">
              </label>
            </div>
          </div>
        </section>

        <section class="tab-pane" id="pane-gitee" aria-label="Gitee配置">
          <div class="panel-soft">
            <h3 class="panel-title">Gitee (码云) 配置</h3>
            <p class="panel-tip">国内访问速度最快，无需代理支持自动建目录</p>
            <div class="form-grid">
              <label>
                用户名 (Owner)
                <input id="set-giteeOwner" type="text" placeholder="Gitee 个人主页空间地址">
              </label>
              <label>
                仓库名 (Repo)
                <input id="set-giteeRepo" type="text" placeholder="仓库名称">
              </label>
              <label class="wide-field">
                分支 (Branch)
                <input id="set-giteeBranch" type="text" value="master" placeholder="master">
              </label>
              <label class="wide-field">
                私人令牌 (Access Token)
                <input id="set-giteeToken" type="password" placeholder="从设置 -> 私人令牌中生成">
              </label>
            </div>
          </div>
        </section>

        <section class="tab-pane" id="pane-github" aria-label="GitHub配置">
          <div class="panel-soft">
            <h3 class="panel-title">GitHub 备份配置</h3>
            <p class="panel-tip">国外主流代码托管，原生跨域直连</p>
            <div class="form-grid">
              <label>
                用户名 (Owner)
                <input id="set-githubOwner" type="text" placeholder="GitHub 用户名">
              </label>
              <label>
                仓库名 (Repo)
                <input id="set-githubRepo" type="text" placeholder="仓库名称">
              </label>
              <label class="wide-field">
                分支 (Branch)
                <input id="set-githubBranch" type="text" value="main" placeholder="main">
              </label>
              <label class="wide-field">
                私人令牌 (Fine-grained Token)
                <input id="set-githubToken" type="password" placeholder="Contents: Read & Write">
              </label>
            </div>
          </div>
        </section>

        <div style="margin-top:20px; display:flex; gap:12px;">
          <button class="primary-action" id="set-saveBtn" type="button" style="margin-top:0">保存全局配置</button>
        </div>
      </div>
    `;
  },

  init() {
    const GLOBAL_SETTINGS_KEY = 'cc-global-settings';
    const q = (sel) => document.querySelector(sel);
    const qAll = (sel) => document.querySelectorAll(sel);

    const defaultSettings = {
      webdavUrl: 'https://dav.jianguoyun.com/dav',
      webdavUser: '',
      webdavPass: '',
      giteeOwner: '',
      giteeRepo: '',
      giteeBranch: 'master',
      giteeToken: '',
      githubOwner: '',
      githubRepo: '',
      githubBranch: 'main',
      githubToken: ''
    };

    const els = {
      webdavUrl: q('#set-webdavUrl'),
      webdavUser: q('#set-webdavUser'),
      webdavPass: q('#set-webdavPass'),
      giteeOwner: q('#set-giteeOwner'),
      giteeRepo: q('#set-giteeRepo'),
      giteeBranch: q('#set-giteeBranch'),
      giteeToken: q('#set-giteeToken'),
      githubOwner: q('#set-githubOwner'),
      githubRepo: q('#set-githubRepo'),
      githubBranch: q('#set-githubBranch'),
      githubToken: q('#set-githubToken'),
      saveBtn: q('#set-saveBtn')
    };

    // 加载配置
    let currentSettings = { ...defaultSettings };
    try {
      const saved = JSON.parse(localStorage.getItem(GLOBAL_SETTINGS_KEY) || '{}');
      currentSettings = { ...defaultSettings, ...saved };
    } catch (e) {
      console.error('Error loading global settings', e);
    }

    // 填充表单
    Object.keys(currentSettings).forEach(key => {
      if (els[key]) {
        els[key].value = currentSettings[key] || '';
      }
    });

    // 选项卡切换逻辑
    const tabBtns = qAll('.tab-btn');
    const tabPanes = qAll('.tab-pane');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const tabId = btn.dataset.tab;
        q(`#pane-${tabId}`).classList.add('active');
      });
    });

    // 保存配置
    els.saveBtn.addEventListener('click', () => {
      const settingsToSave = {};
      Object.keys(defaultSettings).forEach(key => {
        if (els[key]) {
          settingsToSave[key] = els[key].value.trim();
        }
      });

      try {
        localStorage.setItem(GLOBAL_SETTINGS_KEY, JSON.stringify(settingsToSave));
        // 浮动提示
        const oldTip = q('.save-toast-tip');
        if (oldTip) oldTip.remove();

        const tip = document.createElement('div');
        tip.className = 'save-toast-tip';
        tip.style.cssText = `
          position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
          background: rgba(15, 139, 141, 0.95); color: white; padding: 10px 20px;
          border-radius: 30px; font-weight: bold; font-size: 0.88rem; z-index: 9999;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: fadeIn 0.2s;
        `;
        tip.textContent = '全局配置保存成功 ✓';
        document.body.appendChild(tip);

        setTimeout(() => {
          tip.style.opacity = '0';
          tip.style.transition = 'opacity 0.3s';
          setTimeout(() => tip.remove(), 300);
        }, 2000);

      } catch (err) {
        alert('保存失败: ' + err.message);
      }
    });
  },

  destroy() {}
});
