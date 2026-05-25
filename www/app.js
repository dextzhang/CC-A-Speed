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

const els = {
  deleteNoteButton: document.querySelector('#deleteNoteButton'),
  enableGithub: document.querySelector('#enableGithub'),
  enableWebdav: document.querySelector('#enableWebdav'),
  githubBranch: document.querySelector('#githubBranch'),
  githubOwner: document.querySelector('#githubOwner'),
  githubPath: document.querySelector('#githubPath'),
  githubRepo: document.querySelector('#githubRepo'),
  githubToken: document.querySelector('#githubToken'),
  newNoteButton: document.querySelector('#newNoteButton'),
  noteBody: document.querySelector('#noteBody'),
  noteCount: document.querySelector('#noteCount'),
  noteList: document.querySelector('#noteList'),
  noteTitle: document.querySelector('#noteTitle'),
  pullButton: document.querySelector('#pullButton'),
  pushButton: document.querySelector('#pushButton'),
  saveNoteButton: document.querySelector('#saveNoteButton'),
  saveSettingsButton: document.querySelector('#saveSettingsButton'),
  saveState: document.querySelector('#saveState'),
  syncStatus: document.querySelector('#syncStatus'),
  webdavFile: document.querySelector('#webdavFile'),
  webdavPass: document.querySelector('#webdavPass'),
  webdavUrl: document.querySelector('#webdavUrl'),
  webdavUser: document.querySelector('#webdavUser')
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

function normalizeUrlPart(part) {
  return String(part || '').replace(/^\/+|\/+$/g, '');
}

function webdavFileUrl() {
  const base = settings.webdavUrl.trim().replace(/\/+$/g, '');
  return `${base}/${encodeURIComponent(settings.webdavFile.trim() || defaultSettings.webdavFile)}`;
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

async function pushWebdav() {
  const response = await fetch(webdavFileUrl(), {
    method: 'PUT',
    headers: {
      Authorization: authHeader(settings.webdavUser, settings.webdavPass),
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify(backupPayload(), null, 2)
  });

  if (!response.ok) {
    throw new Error(`坚果云推送失败: HTTP ${response.status}`);
  }
}

async function pullWebdav() {
  const response = await fetch(webdavFileUrl(), {
    method: 'GET',
    headers: {
      Authorization: authHeader(settings.webdavUser, settings.webdavPass)
    }
  });

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
  const response = await fetch(url, {
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

  const response = await fetch(githubApiUrl(), {
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

function bindEvents() {
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
}

function init() {
  loadState();
  fillSettingsForm();
  renderEditor();
  renderList();
  bindEvents();
}

init();
