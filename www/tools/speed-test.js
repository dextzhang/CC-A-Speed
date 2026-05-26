CCToolbox.register({
  id: 'speed-test',
  name: '网络测速',
  eyebrow: 'Network Speed',
  icon: '⚡',
  description: '测试下载速度、延迟和网络质量',
  color: '#0f8b8d',

  render() {
    return `
      <section class="panel" aria-label="测速面板">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
          <span class="status-dot ready" id="st-statusDot"></span>
          <span id="st-statusText" style="color:var(--muted);font-size:0.88rem">准备就绪</span>
        </div>

        <div style="text-align:center;padding:10px 0">
          <span class="speed-number" id="st-speedNumber">0.0</span>
          <span class="speed-unit">Mbps</span>
        </div>

        <div class="metric-grid">
          <div class="metric-card">
            <strong id="st-pingValue">--</strong>
            <span>延迟 (ms)</span>
          </div>
          <div class="metric-card">
            <strong id="st-uploadValue">--</strong>
            <span>上传 (Mbps)</span>
          </div>
          <div class="metric-card">
            <strong id="st-jitterValue">--</strong>
            <span>抖动 (ms)</span>
          </div>
        </div>

        <button class="primary-action" id="st-startButton" type="button">开始测速</button>
      </section>

      <section class="panel-soft" aria-label="测速历史">
        <div class="section-heading">
          <h2>最近记录</h2>
          <button class="ghost-button" id="st-clearHistory" type="button" style="min-height:32px;padding:0 10px;font-size:0.82rem">清空</button>
        </div>
        <ul class="history-list" id="st-historyList"></ul>
      </section>
    `;
  },

  init() {
    const historyKey = 'cc-speed-history';
    const q = (sel) => document.querySelector(sel);

    const els = {
      statusDot: q('#st-statusDot'),
      statusText: q('#st-statusText'),
      speedNumber: q('#st-speedNumber'),
      pingValue: q('#st-pingValue'),
      uploadValue: q('#st-uploadValue'),
      jitterValue: q('#st-jitterValue'),
      startButton: q('#st-startButton'),
      clearHistory: q('#st-clearHistory'),
      historyList: q('#st-historyList')
    };

    let running = false;
    let abortController = null;

    const testFiles = [
      { url: 'https://speed.cloudflare.com/__down?bytes=10000000', size: 10000000 },
      { url: 'https://speed.cloudflare.com/__down?bytes=5000000', size: 5000000 },
      { url: 'https://speed.cloudflare.com/__down?bytes=2500000', size: 2500000 }
    ];

    const uploadUrl = 'https://speed.cloudflare.com/__up';

    function readHistory() {
      try {
        return JSON.parse(localStorage.getItem(historyKey)) || [];
      } catch {
        return [];
      }
    }

    function writeHistory(list) {
      try {
        localStorage.setItem(historyKey, JSON.stringify(list.slice(0, 20)));
      } catch {}
    }

    function setStatus(text, state) {
      els.statusText.textContent = text;
      els.statusDot.className = `status-dot ${state}`;
    }

    function setRunning(isRunning) {
      running = isRunning;
      els.startButton.disabled = isRunning;
      els.startButton.textContent = isRunning ? '测速中...' : '开始测速';
    }

    function animateSpeed(target) {
      const current = parseFloat(els.speedNumber.textContent) || 0;
      const diff = target - current;
      const steps = 12;
      let step = 0;

      function tick() {
        step++;
        const progress = step / steps;
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = current + diff * eased;
        els.speedNumber.textContent = value.toFixed(1);
        if (step < steps) {
          requestAnimationFrame(tick);
        }
      }
      requestAnimationFrame(tick);
    }

    async function measurePing() {
      setStatus('正在测量延迟...', 'running');
      const pings = [];
      const targetUrl = 'https://speed.cloudflare.com/__down?bytes=0';

      for (let i = 0; i < 5; i++) {
        try {
          const start = performance.now();
          await fetch(targetUrl, {
            signal: abortController?.signal,
            cache: 'no-store'
          });
          const end = performance.now();
          pings.push(end - start);
        } catch (e) {
          if (e.name === 'AbortError') throw e;
        }
      }

      if (pings.length === 0) return { ping: -1, jitter: -1 };

      pings.sort((a, b) => a - b);
      const median = pings[Math.floor(pings.length / 2)];

      let jitterSum = 0;
      for (let i = 1; i < pings.length; i++) {
        jitterSum += Math.abs(pings[i] - pings[i - 1]);
      }
      const jitter = pings.length > 1 ? jitterSum / (pings.length - 1) : 0;

      return { ping: Math.round(median), jitter: Math.round(jitter * 10) / 10 };
    }

    async function measureDownload() {
      setStatus('正在测试下载...', 'running');
      let totalBytes = 0;
      const startTime = performance.now();

      for (const file of testFiles) {
        try {
          const response = await fetch(file.url + '&r=' + Math.random(), {
            signal: abortController?.signal,
            cache: 'no-store'
          });
          if (!response.ok) continue;

          const reader = response.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            totalBytes += value.length;

            const elapsed = (performance.now() - startTime) / 1000;
            if (elapsed > 0.5) {
              const speed = (totalBytes * 8) / (elapsed * 1000000);
              animateSpeed(speed);
            }
          }
        } catch (e) {
          if (e.name === 'AbortError') throw e;
        }
      }

      const elapsed = (performance.now() - startTime) / 1000;
      return elapsed > 0 ? (totalBytes * 8) / (elapsed * 1000000) : 0;
    }

    async function measureUpload() {
      setStatus('正在测试上传...', 'running');
      const data = new Uint8Array(2000000);
      crypto.getRandomValues(data);

      try {
        const start = performance.now();
        await fetch(uploadUrl, {
          method: 'POST',
          body: data,
          signal: abortController?.signal,
          cache: 'no-store'
        });
        const elapsed = (performance.now() - start) / 1000;
        return elapsed > 0 ? (data.length * 8) / (elapsed * 1000000) : 0;
      } catch (e) {
        if (e.name === 'AbortError') throw e;
        return -1;
      }
    }

    async function runTest() {
      if (running) return;
      setRunning(true);
      abortController = new AbortController();

      els.pingValue.textContent = '--';
      els.uploadValue.textContent = '--';
      els.jitterValue.textContent = '--';
      els.speedNumber.textContent = '0.0';

      try {
        const { ping, jitter } = await measurePing();
        if (ping >= 0) {
          els.pingValue.textContent = String(ping);
          els.jitterValue.textContent = String(jitter);
        }

        const downloadSpeed = await measureDownload();
        const finalSpeed = Math.round(downloadSpeed * 10) / 10;
        els.speedNumber.textContent = finalSpeed.toFixed(1);

        const uploadSpeed = await measureUpload();
        if (uploadSpeed >= 0) {
          els.uploadValue.textContent = (Math.round(uploadSpeed * 10) / 10).toFixed(1);
        }

        setStatus('测速完成', 'ready');

        const record = {
          id: Date.now(),
          download: finalSpeed,
          upload: uploadSpeed >= 0 ? Math.round(uploadSpeed * 10) / 10 : null,
          ping,
          jitter,
          time: new Date().toISOString()
        };

        const history = readHistory();
        history.unshift(record);
        writeHistory(history);
        renderHistory();

      } catch (e) {
        if (e.name === 'AbortError') {
          setStatus('已取消', 'ready');
        } else {
          console.error(e);
          setStatus('测速失败: ' + (e.message || '网络错误'), 'error');
        }
      } finally {
        setRunning(false);
        abortController = null;
      }
    }

    function renderHistory() {
      const history = readHistory();
      els.historyList.innerHTML = '';

      if (history.length === 0) {
        els.historyList.innerHTML = '<li class="empty-state">暂无测速记录</li>';
        return;
      }

      history.forEach((record) => {
        const li = document.createElement('li');
        li.className = 'history-item';

        const info = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = `延迟 ${record.ping}ms · 抖动 ${record.jitter}ms`;
        const desc = document.createElement('p');
        desc.textContent = record.upload !== null ? `上传 ${record.upload} Mbps` : '上传未测';
        info.append(title, desc);

        const time = document.createElement('time');
        const date = new Date(record.time);
        time.dateTime = record.time;
        time.textContent = `${date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })} ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;

        const speed = document.createElement('strong');
        speed.style.cssText = 'font-size:1rem;font-weight:800;color:var(--accent-strong)';
        speed.textContent = `${record.download} Mbps`;

        li.append(info, time);
        li.append(speed);
        els.historyList.append(li);
      });
    }

    els.startButton.addEventListener('click', runTest);
    els.clearHistory.addEventListener('click', () => {
      if (!confirm('确定清空所有测速记录？')) return;
      writeHistory([]);
      renderHistory();
    });

    renderHistory();
  },

  destroy() {}
});
