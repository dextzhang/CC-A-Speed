CCToolbox.register({
  id: 'cloud-backup',
  name: '通用云备份',
  eyebrow: 'Cloud Backup',
  icon: '☁️',
  description: '一次配置，任意路径，一键推送/拉取文本数据',
  color: '#5b8def',

  render() {
    return `
      <section class="panel" aria-label="账号配置">
        <div class="section-heading">
          <h2>坚果云账号</h2>
          <span id="cb-configStatus" style="font-size:0.8rem;color:var(--muted)">未配置</span>
        </div>
        <div class="form-grid">
          <label class="wide-field">
            邮箱
            <input id="cb-email" type="email" autocomplete="username" placeholder="坚果云注册邮箱">
          </label>
          <label class="wide-field">
            应用密码
            <input id="cb-password" type="password" autocomplete="current-password" placeholder="第三方应用密码">
          </label>
        </div>
        <button class="primary-button" id="cb-saveConfig" type="button">保存账号配置</button>
      </section>

      <section class="panel-soft" aria-label="备份操作">
        <div class="section-heading">
          <h2>云端路径</h2>
        </div>
        <label class="wide-field">
          文件路径（相对于 WebDAV 根目录）
          <input id="cb-path" type="text" value="CCSyncNotes/backup.json"
                 placeholder="CCSyncNotes/my-folder/data.json">
        </label>
        <p style="color:var(--muted);font-size:0.78rem;margin-top:-4px">
          支持子文件夹，如 CCSyncNotes/todo/tasks.json
        </p>

        <div class="section-heading" style="margin-top:14px">
          <h2>数据内容</h2>
        </div>
        <textarea id="cb-content" spellcheck="false"
                  placeholder="粘贴或输入要备份的 JSON / 文本内容...&#10;&#10;示例：&#10;{&#10;  &quot;app&quot;: &quot;my-tool&quot;,&#10;  &quot;data&quot;: { ... }&#10;}"
                  style="min-height:180px;font-family:Menlo,Consolas,monospace;font-size:0.85rem;line-height:1.5"></textarea>

        <div style="display:flex;align-items:center;gap:10px;margin-top:12px;min-height:36px;color:var(--muted);font-size:0.85rem">
          <span class="status-dot ready" id="cb-statusDot"></span>
          <span id="cb-statusText">准备就绪</span>
          <span id="cb-lastSync" style="margin-left:auto;font-size:0.78rem"></span>
        </div>

        <div class="action-row">
          <button class="ghost-button" id="cb-pullBtn" type="button">从云端拉取</button>
          <button class="primary-button" id="cb-pushBtn" type="button">推送到云端</button>
        </div>
      </section>

      <section class="panel-soft" aria-label="快捷历史">
        <div class="section-heading">
          <h2>最近备份的路径</h2>
          <button class="ghost-button" id="cb-clearHistory" type="button" style="min-height:32px;padding:0 10px;font-size:0.82rem">清空</button>
        </div>
        <ul class="history-list" id="cb-historyList"></ul>
      </section>
    `;
  },

  init() {
    const q = (s) => document.querySelector(s);
    const els = {
      email: q('#cb-email'),
      password: q('#cb-password'),
      saveConfig: q('#cb-saveConfig'),
      path: q('#cb-path'),
      content: q('#cb-content'),
      pushBtn: q('#cb-pushBtn'),
      pullBtn: q('#cb-pullBtn'),
      statusDot: q('#cb-statusDot'),
      statusText: q('#cb-statusText'),
      lastSync: q('#cb-lastSync'),
      configStatus: q('#cb-configStatus'),
      clearHistory: q('#cb-clearHistory'),
      historyList: q('#cb-historyList')
    };

    const CONFIG_KEY = 'cc-cloud-backup-config';
    const HISTORY_KEY = 'cc-cloud-backup-history';
    const DEFAULT_PATH = 'CCSyncNotes/backup.json';

    function setStatus(text, state) {
      els.statusText.textContent = text;
      els.statusDot.className = 'status-dot ' + (state || 'ready');
      if (state === 'error') els.statusText.style.color = 'var(--danger)';
      else els.statusText.style.color = '';
    }

    function setButtons(disabled) {
      els.pushBtn.disabled = disabled;
      els.pullBtn.disabled = disabled;
    }

    function loadConfig() {
      try {
        const cfg = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
        if (cfg.email) els.email.value = cfg.email;
        if (cfg.password) els.password.value = cfg.password;
        if (cfg.email && cfg.password) {
          els.configStatus.textContent = '已配置';
          els.configStatus.style.color = 'var(--accent-strong)';
          initWebdav(cfg);
        }
      } catch {}
    }

    function initWebdav(cfg) {
      if (typeof CCWebdav !== 'undefined' && CCWebdav.init) {
        CCWebdav.init({
          baseUrl: 'https://dav.jianguoyun.com/dav',
          username: cfg.email,
          password: cfg.password
        });
      }
    }

    function saveConfig() {
      const email = els.email.value.trim();
      const password = els.password.value.trim();

      if (!email || !password) {
        setStatus('请填写邮箱和应用密码', 'error');
        return false;
      }

      const cfg = { email, password };
      localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
      els.configStatus.textContent = '已配置';
      els.configStatus.style.color = 'var(--accent-strong)';
      initWebdav(cfg);
      setStatus('账号配置已保存');
      return true;
    }

    function loadHistory() {
      try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      } catch { return []; }
    }

    function saveHistory(history) {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 15)));
    }

    function renderHistory() {
      const history = loadHistory();
      els.historyList.innerHTML = '';

      if (history.length === 0) {
        els.historyList.innerHTML = '<li class="empty-state">暂无备份记录</li>';
        return;
      }

      history.forEach(function(item) {
        const li = document.createElement('li');
        li.className = 'history-item';

        const info = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = item.path;
        title.style.cssText = 'word-break:break-all;font-size:0.85rem';
        const desc = document.createElement('p');
        desc.textContent = item.action + ' · ' + (item.size || '');
        desc.style.fontSize = '0.78rem';
        info.append(title, desc);

        const time = document.createElement('time');
        time.dateTime = item.time;
        time.textContent = new Date(item.time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

        li.append(info, time);
        li.style.cursor = 'pointer';
        li.addEventListener('click', function() {
          els.path.value = item.path;
        });

        els.historyList.append(li);
      });
    }

    function addHistoryItem(path, action, size) {
      const history = loadHistory();
      history.unshift({
        path: path,
        action: action,
        size: size,
        time: new Date().toISOString()
      });
      saveHistory(history);
      renderHistory();
    }

    els.saveConfig.addEventListener('click', function() {
      saveConfig();
    });

    els.pushBtn.addEventListener('click', async function() {
      if (!saveConfig()) return;

      var path = els.path.value.trim() || DEFAULT_PATH;
      var rawContent = els.content.value;

      var data;
      try {
        data = JSON.parse(rawContent);
      } catch {
        data = rawContent;
      }

      setButtons(true);
      setStatus('正在推送...', 'running');

      try {
        await CCWebdav.push(path, data);
        var now = new Date();
        els.lastSync.textContent = '同步于 ' + now.toLocaleTimeString('zh-CN');
        setStatus('推送成功 ✓');
        addHistoryItem(path, '推送', formatSize(rawContent.length));
      } catch (e) {
        console.error(e);
        setStatus(e.message || '推送失败', 'error');
      } finally {
        setButtons(false);
      }
    });

    els.pullBtn.addEventListener('click', async function() {
      if (!saveConfig()) return;

      var path = els.path.value.trim() || DEFAULT_PATH;

      setButtons(true);
      setStatus('正在拉取...', 'running');

      try {
        var data = await CCWebdav.pull(path);

        if (data === null) {
          setStatus('云端无此文件', 'error');
          els.content.value = '';
          return;
        }

        if (typeof data === 'object') {
          els.content.value = JSON.stringify(data, null, 2);
        } else {
          els.content.value = String(data);
        }

        var now = new Date();
        els.lastSync.textContent = '同步于 ' + now.toLocaleTimeString('zh-CN');
        setStatus('拉取成功 ✓');
        addHistoryItem(path, '拉取', formatSize(els.content.value.length));
      } catch (e) {
        console.error(e);
        setStatus(e.message || '拉取失败', 'error');
      } finally {
        setButtons(false);
      }
    });

    els.clearHistory.addEventListener('click', function() {
      if (!confirm('清空所有备份记录？')) return;
      saveHistory([]);
      renderHistory();
    });

    els.path.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        els.pullBtn.click();
      }
    });

    function formatSize(len) {
      if (len < 1024) return len + ' B';
      if (len < 1024 * 1024) return (len / 1024).toFixed(1) + ' KB';
      return (len / 1024 / 1024).toFixed(1) + ' MB';
    }

    loadConfig();
    renderHistory();
  },

  destroy() {}
});
