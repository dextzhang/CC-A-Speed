CCToolbox.register({
  id: 'sync-notes',
  name: '文本同步',
  eyebrow: 'Local first notes',
  icon: '📝',
  description: '本地笔记 + 坚果云/GitHub 同步备份',
  color: '#19735a',

  render() {
    return `
      <section class="panel" aria-label="笔记编辑器">
        <div style="display:grid;grid-template-columns:1fr auto;gap:10px;align-items:end">
          <label>
            <span>标题</span>
            <input id="sn-noteTitle" type="text" autocomplete="off" placeholder="新的想法">
          </label>
          <button class="ghost-button danger" id="sn-deleteNoteButton" type="button">删除</button>
        </div>
        <textarea id="sn-noteBody" spellcheck="false" placeholder="写点什么，先存在手机本地，再同步到坚果云或 GitHub。"></textarea>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:52px;margin-top:10px;color:var(--muted);font-size:0.9rem">
          <span id="sn-saveState">已准备</span>
          <div style="display:flex;gap:8px">
            <button class="icon-button" id="sn-newNoteButton" type="button" aria-label="新建笔记" title="新建笔记">+</button>
            <button class="primary-button" id="sn-saveNoteButton" type="button">保存笔记</button>
          </div>
        </div>
      </section>

      <section class="panel-soft" aria-label="同步设置">
        <div class="section-heading">
          <h2>同步目标</h2>
          <span id="sn-syncStatus">未同步</span>
        </div>

        <div class="target-row">
          <label class="target-toggle">
            <input id="sn-enableWebdav" type="checkbox">
            <span>坚果云 WebDAV</span>
          </label>
          <label class="target-toggle">
            <input id="sn-enableGithub" type="checkbox">
            <span>GitHub 备份</span>
          </label>
        </div>

        <details class="config-block" open>
          <summary>坚果云 WebDAV</summary>
          <div class="form-grid">
            <label>
              WebDAV 地址
              <input id="sn-webdavUrl" type="url" placeholder="https://dav.jianguoyun.com/dav/CCSyncNotes">
            </label>
            <label>
              坚果云账号
              <input id="sn-webdavUser" type="email" autocomplete="username" placeholder="你的邮箱">
            </label>
            <label>
              应用密码
              <input id="sn-webdavPass" type="password" autocomplete="current-password" placeholder="不是登录密码">
            </label>
            <label>
              备份文件名
              <input id="sn-webdavFile" type="text" placeholder="cc-notes-backup.json">
            </label>
          </div>
        </details>

        <details class="config-block">
          <summary>GitHub</summary>
          <div class="form-grid">
            <label>
              Owner
              <input id="sn-githubOwner" type="text" autocomplete="off" placeholder="dextzhang">
            </label>
            <label>
              Repo
              <input id="sn-githubRepo" type="text" autocomplete="off" placeholder="notes-backup">
            </label>
            <label>
              Branch
              <input id="sn-githubBranch" type="text" autocomplete="off" placeholder="main">
            </label>
            <label>
              文件路径
              <input id="sn-githubPath" type="text" autocomplete="off" placeholder="cc-notes-backup.json">
            </label>
            <label class="wide-field">
              Fine-grained token
              <input id="sn-githubToken" type="password" autocomplete="off" placeholder="Contents: Read and write">
            </label>
          </div>
        </details>

        <div class="action-row">
          <button class="ghost-button" id="sn-saveSettingsButton" type="button">保存配置</button>
          <button class="ghost-button" id="sn-pullButton" type="button">拉取合并</button>
          <button class="primary-button" id="sn-pushButton" type="button">推送备份</button>
        </div>
      </section>

      <section class="panel-soft" aria-label="笔记列表">
        <div class="section-heading">
          <h2>本地笔记</h2>
          <strong id="sn-noteCount">0</strong>
        </div>
        <ul class="note-list" id="sn-noteList"></ul>
      </section>
    `;
  },

  init() {
    const notesKey = 'cc-sync-notes';
    const settingsKey = 'cc-sync-settings';
    const backupVersion = 1;

    const defaultSettings = {
      enableWebdav: true,
      enableGithub: false,
      webdavUrl: 'https://dav.jianguoyun.com/dav/CCSyncNotes',
      webdavUser: '',
      webdavPass: '',
      webdavFile: 'cc-notes-backup.json',
      githubOwner: '',
      githubRepo: '',
      githubBranch: 'main',
      githubPath: 'cc-notes-backup.json',
      githubToken: ''
    };

    const q = (sel) => document.querySelector(sel);

    const els = {
      deleteNoteButton: q('#sn-deleteNoteButton'),
      enableGithub: q('#sn-enableGithub'),
      enableWebdav: q('#sn-enableWebdav'),
      githubBranch: q('#sn-githubBranch'),
      githubOwner: q('#sn-githubOwner'),
      githubPath: q('#sn-githubPath'),
      githubRepo: q('#sn-githubRepo'),
      githubToken: q('#sn-githubToken'),
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
      webdavPass: q('#sn-webdavPass'),
      webdavUrl: q('#sn-webdavUrl'),
      webdavUser: q('#sn-webdavUser')
    };

    let notes = [];
    let settings = { ...defaultSettings };
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

    function webdavFileUrl() {
      const base = settings.webdavUrl.trim().replace(/\/+$/g, '');
      return `${base}/${encodeURIComponent(settings.webdavFile.trim() || defaultSettings.webdavFile)}`;
    }

    function proxyWebdav(url) {
      if (isAndroid) return url;
      return '/api/webdav?url=' + encodeURIComponent(url);
    }

    function proxyGithub(url) {
      // GitHub API 原生支持 CORS，所有环境都可以直连
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
          body: '这个原型会先把笔记保存在本地。配置坚果云 WebDAV 或 GitHub 后，可以手动拉取和推送备份。',
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
        enableGithub: els.enableGithub.checked,
        webdavUrl: els.webdavUrl.value.trim(),
        webdavUser: els.webdavUser.value.trim(),
        webdavPass: els.webdavPass.value,
        webdavFile: els.webdavFile.value.trim() || defaultSettings.webdavFile,
        githubOwner: els.githubOwner.value.trim(),
        githubRepo: els.githubRepo.value.trim(),
        githubBranch: els.githubBranch.value.trim() || defaultSettings.githubBranch,
        githubPath: els.githubPath.value.trim() || defaultSettings.githubPath,
        githubToken: els.githubToken.value.trim()
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
        const title = document.createElement('strong');
        title.textContent = note.title || '未命名笔记';
        const preview = document.createElement('p');
        preview.textContent = notePreview(note);
        content.append(title, preview);

        const time = document.createElement('time');
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
        if (!settings.webdavUrl || !settings.webdavUser || !settings.webdavPass) {
          throw new Error('请补全坚果云 WebDAV 地址、账号和应用密码');
        }
        targets.push('webdav');
      }
      if (settings.enableGithub) {
        if (!settings.githubOwner || !settings.githubRepo || !settings.githubToken) {
          throw new Error('请补全 GitHub owner、repo 和 token');
        }
        targets.push('github');
      }
      if (targets.length === 0) {
        throw new Error('请至少选择一个同步目标');
      }
      return targets;
    }

    async function ensureWebdavFolder() {
      const base = settings.webdavUrl.trim().replace(/\/+$/g, '');
      const response = await fetch(proxyWebdav(base + '/'), {
        method: 'PROPFIND',
        headers: {
          Authorization: authHeader(settings.webdavUser, settings.webdavPass),
          Depth: '0'
        }
      });
      if (response.status === 404) {
        const folderUrl = base.endsWith('/') ? base : base + '/';
        const createResponse = await fetch(proxyWebdav(folderUrl), {
          method: 'MKCOL',
          headers: {
            Authorization: authHeader(settings.webdavUser, settings.webdavPass)
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
            Authorization: authHeader(settings.webdavUser, settings.webdavPass),
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
            Authorization: authHeader(settings.webdavUser, settings.webdavPass),
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
            Authorization: authHeader(settings.webdavUser, settings.webdavPass)
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

    function githubApiUrl() {
      const owner = normalizeUrlPart(settings.githubOwner);
      const repo = normalizeUrlPart(settings.githubRepo);
      const path = settings.githubPath.split('/').map(encodeURIComponent).join('/');
      return `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    }

    async function fetchGithubFile() {
      const url = `${githubApiUrl()}?ref=${encodeURIComponent(settings.githubBranch)}`;
      const response = await fetch(proxyGithub(url), {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${settings.githubToken}`,
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
        branch: settings.githubBranch
      };

      if (existing?.sha) {
        body.sha = existing.sha;
      }

      const response = await fetch(proxyGithub(githubApiUrl()), {
        method: 'PUT',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${settings.githubToken}`,
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
      const targets = validateTargets();
      setSyncStatus('正在推送...');
      setSyncButtons(true);

      try {
        const jobs = targets.map((target) => (target === 'webdav' ? pushWebdav() : pushGithub()));
        await Promise.all(jobs);
        setSyncStatus(`推送完成 ${new Date().toLocaleTimeString('zh-CN')}`);
      } finally {
        setSyncButtons(false);
      }
    }

    async function pullSelectedTargets() {
      collectSettings();
      const targets = validateTargets();
      setSyncStatus('正在拉取...');
      setSyncButtons(true);

      try {
        const groups = await Promise.all(targets.map((target) => (target === 'webdav' ? pullWebdav() : pullGithub())));
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
