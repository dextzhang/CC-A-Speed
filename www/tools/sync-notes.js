CCToolbox.register({
  id: 'sync-notes',
  name: '文本同步',
  eyebrow: 'Local first notes',
  icon: '📝',
  description: '本地笔记 + 坚果云/Gitee/GitHub 统一同步备份',
  color: '#19735a',

  render() {
    return `
      <section class="panel" aria-label="笔记编辑器">
        <div style="display:grid;grid-template-columns:1fr auto;gap:10px;align-items:end">
          <label>
            <span>标题</span>
            <input id="sn-noteTitle" type="text" autocomplete="off" placeholder="输入笔记标题...">
          </label>
          <button class="ghost-button danger" id="sn-deleteNoteButton" type="button">删除</button>
        </div>
        <textarea id="sn-noteBody" spellcheck="false" placeholder="写点什么，先存在手机本地，再同步到云端。"></textarea>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:52px;margin-top:10px;color:var(--muted);font-size:0.9rem">
          <span id="sn-saveState" style="font-weight:700">已准备</span>
          <div style="display:flex;gap:8px">
            <button class="icon-button" id="sn-newNoteButton" type="button" aria-label="新建笔记" title="新建笔记">+</button>
            <button class="primary-button" id="sn-saveNoteButton" type="button">保存笔记</button>
          </div>
        </div>
      </section>

      <section class="panel-soft" aria-label="同步设置">
        <div class="section-heading">
          <h2>同步配置</h2>
          <span id="sn-syncStatus" style="font-weight:700">未同步</span>
        </div>

        <div class="target-row">
          <label class="target-toggle">
            <input id="sn-enableWebdav" type="checkbox">
            <span>坚果云 WebDAV</span>
          </label>
          <label class="target-toggle">
            <input id="sn-enableGitee" type="checkbox">
            <span>Gitee 同步</span>
          </label>
          <label class="target-toggle">
            <input id="sn-enableGithub" type="checkbox">
            <span>GitHub 备份</span>
          </label>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin: 12px 0 16px; padding: 12px 14px; border-radius:12px; background:var(--surface-soft); border:1px dashed var(--line)">
          <span style="font-size:0.8rem; font-weight:700; color:var(--muted)">云端授权账户管理</span>
          <a href="#/settings" class="sync-config-shortcut">⚙️ 配置第三方账户授权</a>
        </div>

        <details class="config-block">
          <summary>自定义备份文件名</summary>
          <div class="form-grid" style="margin-top:10px">
            <label>
              坚果云文件名
              <input id="sn-webdavFile" type="text" placeholder="cc-notes-backup.json">
            </label>
            <label>
              Gitee 文件路径
              <input id="sn-giteePath" type="text" placeholder="cc-notes-backup.json">
            </label>
            <label class="wide-field">
              GitHub 文件路径
              <input id="sn-githubPath" type="text" placeholder="cc-notes-backup.json">
            </label>
          </div>
        </details>

        <div class="action-row" style="margin-top:20px">
          <button class="ghost-button" id="sn-saveSettingsButton" type="button">保存配置</button>
          <button class="ghost-button" id="sn-pullButton" type="button">拉取合并</button>
          <button class="primary-button" id="sn-pushButton" type="button">推送备份</button>
        </div>
      </section>

      <section class="panel-soft" aria-label="笔记列表">
        <div class="section-heading">
          <h2>本地笔记</h2>
          <strong id="sn-noteCount" style="background:var(--accent); color:white; padding: 2px 10px; border-radius:12px; font-size:0.85rem">0</strong>
        </div>
        <ul class="note-list" id="sn-noteList"></ul>
      </section>
    `;
  },

  init() {
    const notesKey = 'cc-sync-notes';
    const settingsKey = 'cc-sync-settings';
    const GLOBAL_SETTINGS_KEY = 'cc-global-settings';
    const backupVersion = 1;

    const defaultSettings = {
      enableWebdav: true,
      enableGitee: false,
      enableGithub: false,
      webdavFile: 'cc-notes-backup.json',
      giteePath: 'cc-notes-backup.json',
      githubPath: 'cc-notes-backup.json'
    };

    const q = (sel) => document.querySelector(sel);

    const els = {
      deleteNoteButton: q('#sn-deleteNoteButton'),
      enableGithub: q('#sn-enableGithub'),
      enableGitee: q('#sn-enableGitee'),
      enableWebdav: q('#sn-enableWebdav'),
      newNoteButton: q('#sn-newNoteButton'),
      noteBody: q('#sn-noteBody'),
      noteCount: q('#sn-noteCount'),
      noteList: q('#sn-noteList'),
      noteTitle: q('#sn-noteTitle'),
      pullButton: q('#sn-pullButton'),
      pushButton: q('#sn-pushButton'),
      saveNoteButton: q('#sn-saveNoteButton'),
      saveSettingsButton: q('#sn-saveSettingsButton'),
      saveState: q('#sn-saveState'),
      syncStatus: q('#sn-syncStatus'),
      webdavFile: q('#sn-webdavFile'),
      giteePath: q('#sn-giteePath'),
      githubPath: q('#sn-githubPath')
    };

    let notes = [];
    let settings = { ...defaultSettings };
    let globalSettings = {};
    let activeId = '';

    function uid() {
      return `note-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function nowIso() {
      return new Date().toISOString();
    }

    function readJson(key, fallback) {
      try {
        const value = JSON.parse(localStorage.getItem(key));
        return value !== null && value !== undefined ? value : fallback;
      } catch {
        return fallback;
      }
    }

    function writeJson(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        if (e.name === 'QuotaExceededError' || e.code === 22) {
          throw new Error('本地存储空间不足，请删除部分笔记后重试');
        }
        throw e;
      }
    }

    const isAndroid = /Android/i.test(navigator.userAgent);

    function normalizeUrlPart(part) {
      return String(part || '').replace(/^\/+|\/+$/g, '');
    }

    function loadGlobalSettings() {
      try {
        globalSettings = JSON.parse(localStorage.getItem(GLOBAL_SETTINGS_KEY) || '{}');
      } catch {
        globalSettings = {};
      }
    }

    function webdavFileUrl() {
      const base = (globalSettings.webdavUrl || 'https://dav.jianguoyun.com/dav').trim().replace(/\/+$/g, '');
      const file = settings.webdavFile.trim() || 'cc-notes-backup.json';
      return `${base}/${encodeURIComponent(file)}`;
    }

    function proxyWebdav(url) {
      if (isAndroid) return url;
      return '/api/webdav?url=' + encodeURIComponent(url);
    }

    function proxyGithub(url) {
      return url;
    }

    function backupPayload() {
      return {
        app: 'cc-sync-notes',
        version: backupVersion,
        exportedAt: nowIso(),
        notes
      };
    }

    function encodeBase64Unicode(text) {
      const bytes = new TextEncoder().encode(text);
      const chunks = [];
      bytes.forEach((byte) => {
        chunks.push(String.fromCharCode(byte));
      });
      return btoa(chunks.join(''));
    }

    function decodeBase64Unicode(text) {
      const binary = atob(text.replace(/\n/g, ''));
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }

    function authHeader(user, pass) {
      return `Basic ${encodeBase64Unicode(`${user}:${pass}`)}`;
    }

    function setSyncStatus(text, isError = false) {
      els.syncStatus.textContent = text;
      els.syncStatus.style.color = isError ? 'var(--danger)' : 'var(--muted)';
    }

    function setSaveState(text) {
      els.saveState.textContent = text;
    }

    function loadState() {
      notes = readJson(notesKey, []);
      settings = { ...defaultSettings, ...readJson(settingsKey, {}) };

      if (notes.length === 0) {
        const createdAt = nowIso();
        notes = [{
          id: uid(),
          title: '第一条同步笔记',
          body: '配置 Gitee、GitHub 或坚果云 WebDAV 后，可以拉取和推送备份。',
          createdAt,
          updatedAt: createdAt
        }];
        writeJson(notesKey, notes);
      }

      activeId = notes[0]?.id || '';
    }

    function saveNotes() {
      writeJson(notesKey, notes);
    }

    function fillSettingsForm() {
      Object.keys(defaultSettings).forEach((key) => {
        if (!els[key]) return;
        if (els[key].type === 'checkbox') {
          els[key].checked = Boolean(settings[key]);
          return;
        }
        els[key].value = settings[key] || '';
      });
    }

    function collectSettings() {
      settings = {
        enableWebdav: els.enableWebdav.checked,
        enableGitee: els.enableGitee.checked,
        enableGithub: els.enableGithub.checked,
        webdavFile: els.webdavFile.value.trim() || 'cc-notes-backup.json',
        giteePath: els.giteePath.value.trim() || 'cc-notes-backup.json',
        githubPath: els.githubPath.value.trim() || 'cc-notes-backup.json'
      };
      writeJson(settingsKey, settings);
    }

    function activeNote() {
      return notes.find((note) => note.id === activeId) || notes[0];
    }

    function renderEditor() {
      const note = activeNote();
      if (!note) return;
      activeId = note.id;
      els.noteTitle.value = note.title;
      els.noteBody.value = note.body;
      setSaveState(`本地更新时间 ${new Date(note.updatedAt).toLocaleString('zh-CN')}`);
    }

    function notePreview(note) {
      const text = note.body.trim().replace(/\s+/g, ' ');
      return text || '空白笔记';
    }

    function renderList() {
      const sorted = [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      els.noteList.innerHTML = '';
      els.noteCount.textContent = String(notes.length);

      if (sorted.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'empty-state';
        empty.textContent = '还没有笔记';
        els.noteList.append(empty);
        return;
      }

      sorted.forEach((note) => {
        const item = document.createElement('li');
        item.className = `note-item${note.id === activeId ? ' active' : ''}`;

        const button = document.createElement('button');
        button.type = 'button';
        button.addEventListener('click', () => {
          activeId = note.id;
          renderEditor();
          renderList();
        });

        const content = document.createElement('div');
        content.className = 'note-item-content';
        const title = document.createElement('h4');
        title.className = 'note-item-title';
        title.textContent = note.title || '未命名笔记';
        const preview = document.createElement('p');
        preview.className = 'note-item-preview';
        preview.textContent = notePreview(note);
        content.append(title, preview);

        const time = document.createElement('time');
        time.className = 'note-item-time';
        time.dateTime = note.updatedAt;
        time.textContent = new Date(note.updatedAt).toLocaleDateString('zh-CN', {
          month: '2-digit',
          day: '2-digit'
        });

        button.append(content, time);
        item.append(button);
        els.noteList.append(item);
      });
    }

    function saveActiveNote() {
      const note = activeNote();
      if (!note) return;
      note.title = els.noteTitle.value.trim() || '未命名笔记';
      note.body = els.noteBody.value;
      note.updatedAt = nowIso();
      saveNotes();
      renderEditor();
      renderList();
    }

    function newNote() {
      const createdAt = nowIso();
      const note = {
        id: uid(),
        title: '新的笔记',
        body: '',
        createdAt,
        updatedAt: createdAt
      };
      notes.unshift(note);
      activeId = note.id;
      saveNotes();
      renderEditor();
      renderList();
    }

    function deleteActiveNote() {
      if (!confirm('确定删除这条笔记吗？')) return;
      if (notes.length <= 1) {
        notes[0].title = '新的笔记';
        notes[0].body = '';
        notes[0].updatedAt = nowIso();
      } else {
        notes = notes.filter((note) => note.id !== activeId);
        activeId = notes[0].id;
      }
      saveNotes();
      renderEditor();
      renderList();
    }

    function validateTargets() {
      const targets = [];
      if (settings.enableWebdav) {
        if (!globalSettings.webdavUrl || !globalSettings.webdavUser || !globalSettings.webdavPass) {
          throw new Error('未检测到坚果云 WebDAV 账号。请点击【配置第三方账户授权】进行设置。');
        }
        targets.push('webdav');
      }
      if (settings.enableGitee) {
        if (!globalSettings.giteeOwner || !globalSettings.giteeRepo || !globalSettings.giteeToken) {
          throw new Error('未检测到 Gitee 账号。请点击【配置第三方账户授权】进行设置。');
        }
        targets.push('gitee');
      }
      if (settings.enableGithub) {
        if (!globalSettings.githubOwner || !globalSettings.githubRepo || !globalSettings.githubToken) {
          throw new Error('未检测到 GitHub 账号。请点击【配置第三方账户授权】进行设置。');
        }
        targets.push('github');
      }
      if (targets.length === 0) {
        throw new Error('请至少选择一个同步目标');
      }
      return targets;
    }

    async function ensureWebdavFolder() {
      if (isAndroid) {
        throw new Error('坚果云同步目录不存在。由于安卓平台的网络限制，请先在坚果云网页版或客户端中手动创建该文件夹，然后再进行同步。');
      }
      const base = globalSettings.webdavUrl.trim().replace(/\/+$/g, '');
      const response = await fetch(proxyWebdav(base + '/'), {
        method: 'PROPFIND',
        headers: {
          Authorization: authHeader(globalSettings.webdavUser, globalSettings.webdavPass),
          Depth: '0'
        }
      });
      if (response.status === 404) {
        const folderUrl = base.endsWith('/') ? base : base + '/';
        const createResponse = await fetch(proxyWebdav(folderUrl), {
          method: 'MKCOL',
          headers: {
            Authorization: authHeader(globalSettings.webdavUser, globalSettings.webdavPass)
          }
        });
        if (!createResponse.ok && createResponse.status !== 405) {
          throw new Error(`坚果云创建同步目录失败: HTTP ${createResponse.status}`);
        }
      }
    }

    async function pushWebdav() {
      let response;
      try {
        response = await fetch(proxyWebdav(webdavFileUrl()), {
          method: 'PUT',
          headers: {
            Authorization: authHeader(globalSettings.webdavUser, globalSettings.webdavPass),
            'Content-Type': 'application/json; charset=utf-8'
          },
          body: JSON.stringify(backupPayload(), null, 2)
        });
      } catch (e) {
        if (!isAndroid) {
          throw new Error('坚果云连接失败（浏览器 CORS 限制）。请先运行 npm run serve 启动代理服务器，然后通过 http://localhost:4173 访问');
        }
        throw new Error('坚果云连接失败: ' + (e.message || '网络错误'));
      }

      if (response.status === 409) {
        await ensureWebdavFolder();
        const retry = await fetch(proxyWebdav(webdavFileUrl()), {
          method: 'PUT',
          headers: {
            Authorization: authHeader(globalSettings.webdavUser, globalSettings.webdavPass),
            'Content-Type': 'application/json; charset=utf-8'
          },
          body: JSON.stringify(backupPayload(), null, 2)
        });
        if (!retry.ok) {
          throw new Error(`坚果云推送失败: HTTP ${retry.status}`);
        }
        return;
      }

      if (!response.ok) {
        throw new Error(`坚果云推送失败: HTTP ${response.status}`);
      }
    }

    async function pullWebdav() {
      let response;
      try {
        response = await fetch(proxyWebdav(webdavFileUrl()), {
          method: 'GET',
          headers: {
            Authorization: authHeader(globalSettings.webdavUser, globalSettings.webdavPass)
          }
        });
      } catch (e) {
        if (!isAndroid) {
          throw new Error('坚果云连接失败（浏览器 CORS 限制）。请先运行 npm run serve 启动代理服务器，然后通过 http://localhost:4173 访问');
        }
        throw new Error('坚果云连接失败: ' + (e.message || '网络错误'));
      }

      if (response.status === 404) return [];
      if (!response.ok) {
        throw new Error(`坚果云拉取失败: HTTP ${response.status}`);
      }

      const payload = await response.json();
      return Array.isArray(payload.notes) ? payload.notes : [];
    }

    function giteeApiUrl() {
      const owner = normalizeUrlPart(globalSettings.giteeOwner);
      const repo = normalizeUrlPart(globalSettings.giteeRepo);
      const path = settings.giteePath.split('/').map(encodeURIComponent).join('/');
      return `https://gitee.com/api/v5/repos/${owner}/${repo}/contents/${path}`;
    }

    async function fetchGiteeFile() {
      const url = `${giteeApiUrl()}?access_token=${encodeURIComponent(globalSettings.giteeToken)}&ref=${encodeURIComponent(globalSettings.giteeBranch)}`;
      const response = await fetch(url);

      if (response.status === 404) return null;
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Gitee 请求被拒绝 (401/403)，请检查您的私人令牌权限');
        }
        throw new Error(`Gitee 读取失败: HTTP ${response.status}`);
      }
      return response.json();
    }

    async function pushGitee() {
      const existing = await fetchGiteeFile();
      const body = {
        access_token: globalSettings.giteeToken,
        message: 'chore: sync cc notes backup',
        content: encodeBase64Unicode(JSON.stringify(backupPayload(), null, 2)),
        branch: globalSettings.giteeBranch
      };

      if (existing?.sha) {
        body.sha = existing.sha;
      }

      const response = await fetch(giteeApiUrl(), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Gitee 推送被拒绝 (401/403)，请检查您的私人令牌权限');
        }
        throw new Error(`Gitee 推送失败: HTTP ${response.status}`);
      }
    }

    async function pullGitee() {
      const file = await fetchGiteeFile();
      if (!file?.content) return [];
      try {
        const payload = JSON.parse(decodeBase64Unicode(file.content));
        return Array.isArray(payload.notes) ? payload.notes : [];
      } catch {
        throw new Error('Gitee 备份文件内容损坏，无法解析');
      }
    }

    function githubApiUrl() {
      const owner = normalizeUrlPart(globalSettings.githubOwner);
      const repo = normalizeUrlPart(globalSettings.githubRepo);
      const path = settings.githubPath.split('/').map(encodeURIComponent).join('/');
      return `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    }

    async function fetchGithubFile() {
      const url = `${githubApiUrl()}?ref=${encodeURIComponent(globalSettings.githubBranch)}`;
      const response = await fetch(proxyGithub(url), {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${globalSettings.githubToken}`,
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });

      if (response.status === 404) return null;
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('GitHub 请求被拒绝 (403)，可能是 Token 权限不足或 API 限流，请稍后重试');
        }
        throw new Error(`GitHub 读取失败: HTTP ${response.status}`);
      }
      return response.json();
    }

    async function pushGithub() {
      const existing = await fetchGithubFile();
      const body = {
        message: 'chore: sync cc notes backup',
        content: encodeBase64Unicode(JSON.stringify(backupPayload(), null, 2)),
        branch: globalSettings.githubBranch
      };

      if (existing?.sha) {
        body.sha = existing.sha;
      }

      const response = await fetch(proxyGithub(githubApiUrl()), {
        method: 'PUT',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${globalSettings.githubToken}`,
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('GitHub 请求被拒绝 (403)，可能是 Token 权限不足或 API 限流，请稍后重试');
        }
        throw new Error(`GitHub 推送失败: HTTP ${response.status}`);
      }
    }

    async function pullGithub() {
      const file = await fetchGithubFile();
      if (!file?.content) return [];
      try {
        const payload = JSON.parse(decodeBase64Unicode(file.content));
        return Array.isArray(payload.notes) ? payload.notes : [];
      } catch {
        throw new Error('GitHub 备份文件内容损坏，无法解析');
      }
    }

    function mergeRemoteNotes(remoteNotes) {
      const byId = new Map(notes.map((note) => [note.id, note]));
      let changed = 0;

      remoteNotes.forEach((remote) => {
        if (!remote?.id || !remote.updatedAt) return;
        const local = byId.get(remote.id);
        if (!local) {
          notes.push(remote);
          changed += 1;
          return;
        }
        if (remote.updatedAt > local.updatedAt) {
          local.title = remote.title ?? local.title;
          local.body = remote.body ?? local.body;
          local.updatedAt = remote.updatedAt;
          changed += 1;
        }
      });

      if (changed > 0) {
        notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        saveNotes();
        if (!notes.some((note) => note.id === activeId)) {
          activeId = notes[0]?.id || '';
        }
        renderEditor();
        renderList();
      }

      return changed;
    }

    function setSyncButtons(disabled) {
      els.pushButton.disabled = disabled;
      els.pullButton.disabled = disabled;
    }

    async function pushSelectedTargets() {
      saveActiveNote();
      collectSettings();
      loadGlobalSettings();
      const targets = validateTargets();
      setSyncStatus('正在推送...');
      setSyncButtons(true);

      try {
        const jobs = targets.map((target) => {
          if (target === 'webdav') return pushWebdav();
          if (target === 'gitee') return pushGitee();
          return pushGithub();
        });
        await Promise.all(jobs);
        setSyncStatus(`推送完成 ${new Date().toLocaleTimeString('zh-CN')}`);
      } finally {
        setSyncButtons(false);
      }
    }

    async function pullSelectedTargets() {
      collectSettings();
      loadGlobalSettings();
      const targets = validateTargets();
      setSyncStatus('正在拉取...');
      setSyncButtons(true);

      try {
        const groups = await Promise.all(targets.map((target) => {
          if (target === 'webdav') return pullWebdav();
          if (target === 'gitee') return pullGitee();
          return pullGithub();
        }));
        const changed = groups.reduce((sum, group) => sum + mergeRemoteNotes(group), 0);
        setSyncStatus(`拉取完成，更新 ${changed} 条`);
      } finally {
        setSyncButtons(false);
      }
    }

    async function runSync(action) {
      try {
        await action();
      } catch (error) {
        console.error(error);
        setSyncStatus(error.message || '同步失败', true);
      }
    }

    els.newNoteButton.addEventListener('click', newNote);
    els.saveNoteButton.addEventListener('click', saveActiveNote);
    els.deleteNoteButton.addEventListener('click', deleteActiveNote);
    els.saveSettingsButton.addEventListener('click', () => {
      collectSettings();
      setSyncStatus('配置已保存');
    });
    els.pushButton.addEventListener('click', () => runSync(pushSelectedTargets));
    els.pullButton.addEventListener('click', () => runSync(pullSelectedTargets));
    els.noteTitle.addEventListener('input', () => setSaveState('有未保存修改'));
    els.noteBody.addEventListener('input', () => setSaveState('有未保存修改'));

    loadState();
    fillSettingsForm();
    renderEditor();
    renderList();
  },

  destroy() {}
});
