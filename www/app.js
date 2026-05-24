const endpoints = {
  latency: 'https://speed.cloudflare.com/cdn-cgi/trace',
  download: 'https://speed.cloudflare.com/__down',
  upload: 'https://speed.cloudflare.com/__up'
};

const els = {
  clearHistory: document.querySelector('#clearHistory'),
  downloadBytes: document.querySelector('#downloadBytes'),
  downloadValue: document.querySelector('#downloadValue'),
  historyList: document.querySelector('#historyList'),
  latencyValue: document.querySelector('#latencyValue'),
  networkValue: document.querySelector('#networkValue'),
  settingsPanel: document.querySelector('#settingsPanel'),
  settingsToggle: document.querySelector('#settingsToggle'),
  startButton: document.querySelector('#startButton'),
  startIcon: document.querySelector('#startIcon'),
  startLabel: document.querySelector('#startLabel'),
  statusDot: document.querySelector('#statusDot'),
  statusText: document.querySelector('#statusText'),
  uploadBytes: document.querySelector('#uploadBytes'),
  uploadValue: document.querySelector('#uploadValue')
};

const historyKey = 'cc-a-speed-history';
let isRunning = false;

function formatMbps(value) {
  if (!Number.isFinite(value)) return '--';
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

function formatMs(value) {
  return Number.isFinite(value) ? `${Math.round(value)} ms` : '-- ms';
}

function setStatus(text, state = 'idle') {
  els.statusText.textContent = text;
  els.statusDot.classList.toggle('running', state === 'running');
  els.statusDot.classList.toggle('error', state === 'error');
}

function setRunning(nextRunning) {
  isRunning = nextRunning;
  els.startButton.disabled = nextRunning;
  els.startIcon.textContent = nextRunning ? '⏳' : '▶';
  els.startLabel.textContent = nextRunning ? '测速中' : '开始测速';
}

function getConnectionLabel() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!connection) return '未知';
  return connection.effectiveType ? connection.effectiveType.toUpperCase() : connection.type || '在线';
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(historyKey)) || [];
  } catch {
    return [];
  }
}

function saveHistory(items) {
  localStorage.setItem(historyKey, JSON.stringify(items.slice(0, 8)));
}

function renderHistory() {
  const items = loadHistory();
  els.historyList.innerHTML = '';

  if (items.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.textContent = '暂无测速记录';
    els.historyList.append(empty);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'history-item';

    const left = document.createElement('div');
    const time = document.createElement('time');
    time.dateTime = item.createdAt;
    time.textContent = new Date(item.createdAt).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    const summary = document.createElement('p');
    summary.textContent = `延迟 ${formatMs(item.latency)} · 上传 ${formatMbps(item.upload)} Mbps`;
    left.append(time, summary);

    const speed = document.createElement('strong');
    speed.textContent = `${formatMbps(item.download)} Mbps`;

    li.append(left, speed);
    els.historyList.append(li);
  });
}

async function timedFetch(url, options = {}) {
  const start = performance.now();
  const response = await fetch(url, {
    cache: 'no-store',
    ...options
  });
  return {
    response,
    elapsedMs: performance.now() - start
  };
}

async function measureLatency() {
  const samples = [];

  for (let index = 0; index < 4; index += 1) {
    const url = `${endpoints.latency}?t=${Date.now()}-${index}`;
    const { elapsedMs } = await timedFetch(url, { method: 'GET' });
    samples.push(elapsedMs);
  }

  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)];
}

async function measureDownload(bytes) {
  const url = `${endpoints.download}?bytes=${bytes}&t=${Date.now()}`;
  const start = performance.now();
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`下载测试失败：HTTP ${response.status}`);
  }

  await response.arrayBuffer();
  const elapsedMs = performance.now() - start;
  const seconds = elapsedMs / 1000;
  return (bytes * 8) / seconds / 1_000_000;
}

async function measureUpload(bytes) {
  const chunk = new Uint8Array(bytes);
  crypto.getRandomValues(chunk.subarray(0, Math.min(bytes, 65536)));

  const { response, elapsedMs } = await timedFetch(`${endpoints.upload}?t=${Date.now()}`, {
    method: 'POST',
    body: chunk
  });

  if (!response.ok) {
    throw new Error(`上传测试失败：HTTP ${response.status}`);
  }

  const seconds = elapsedMs / 1000;
  return (bytes * 8) / seconds / 1_000_000;
}

async function runSpeedTest() {
  if (isRunning) return;

  setRunning(true);
  setStatus('正在测延迟', 'running');
  els.downloadValue.textContent = '--';
  els.latencyValue.textContent = '-- ms';
  els.uploadValue.textContent = '-- Mbps';
  els.networkValue.textContent = getConnectionLabel();

  try {
    const latency = await measureLatency();
    els.latencyValue.textContent = formatMs(latency);

    setStatus('正在测下载', 'running');
    const download = await measureDownload(Number(els.downloadBytes.value));
    els.downloadValue.textContent = formatMbps(download);

    setStatus('正在测上传', 'running');
    const upload = await measureUpload(Number(els.uploadBytes.value));
    els.uploadValue.textContent = `${formatMbps(upload)} Mbps`;

    const nextHistory = [
      {
        createdAt: new Date().toISOString(),
        download,
        latency,
        upload
      },
      ...loadHistory()
    ];
    saveHistory(nextHistory);
    renderHistory();
    setStatus('测速完成');
  } catch (error) {
    console.error(error);
    setStatus(error.message || '测速失败', 'error');
  } finally {
    setRunning(false);
  }
}

function bindEvents() {
  els.startButton.addEventListener('click', runSpeedTest);
  els.settingsToggle.addEventListener('click', () => {
    els.settingsPanel.hidden = !els.settingsPanel.hidden;
  });
  els.clearHistory.addEventListener('click', () => {
    saveHistory([]);
    renderHistory();
  });
  window.addEventListener('online', () => {
    els.networkValue.textContent = getConnectionLabel();
    setStatus('网络已连接');
  });
  window.addEventListener('offline', () => {
    els.networkValue.textContent = '离线';
    setStatus('网络不可用', 'error');
  });
}

function init() {
  els.networkValue.textContent = navigator.onLine ? getConnectionLabel() : '离线';
  bindEvents();
  renderHistory();
}

init();
