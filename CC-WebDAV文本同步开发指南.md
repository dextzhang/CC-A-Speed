# CC 工具箱 - WebDAV 文本同步开发指南

本文档记录 CC 工具箱中 WebDAV 文本同步的完整实现方案。任何新工具都可以复用这套机制，将本地数据以文本格式同步到坚果云。

---

## 目录

1. [核心原理](#1-核心原理)
2. [架构总览](#2-架构总览)
3. [文件结构](#3-文件结构)
4. [代理服务器](#4-代理服务器)
5. [WebDAV 公共模块](#5-webdav-公共模块)
6. [在工具中使用同步](#6-在工具中使用同步)
7. [数据格式规范](#7-数据格式规范)
8. [完整代码示例](#8-完整代码示例)
9. [常见问题](#9-常见问题)

---

## 1. 核心原理

### 1.1 为什么用文本同步

```
本地数据（任何结构）
        ↓ JSON.stringify()
文本字符串
        ↓ HTTP PUT（通过代理服务器）
坚果云 WebDAV 服务器 → 写入 .json / .md / .txt 文件
```

任何可以被 `JSON.stringify()` 序列化的 JavaScript 数据，都可以通过 WebDAV 同步到云端：

| 数据类型 | 序列化后 | 适合场景 |
| --- | --- | --- |
| 对象/数组 | JSON 字符串 | 笔记、配置、清单、账本 |
| 纯文本 | 原始字符串 | 日志、草稿、代码片段 |
| Base64 编码 | 字符串 | 小图片、小文件（不推荐大文件） |

### 1.2 为什么需要代理服务器

桌面浏览器有**同源策略（CORS）**安全限制：

```
❌ 浏览器直接请求：
   http://localhost:4173  →  https://dav.jianguoyun.com
   跨域！浏览器拦截 → net::ERR_FAILED

✅ 通过代理服务器：
   http://localhost:4173  →  localhost:4173/api/webdav?url=...
   同源！浏览器放行 → 代理转发到坚果云
```

安卓 App 内的 WebView 不受 CORS 限制，可以直接请求。但开发时需要代理来测试。

---

## 2. 架构总览

```
┌─────────────────────────────────────────────┐
│              浏览器 / 安卓 WebView           │
│                                             │
│  ┌──────────┐    ┌──────────┐    ┌───────┐ │
│  │ 工具 A   │    │ 工具 B   │    │ 工具 C │ │
│  │ (笔记)   │    │ (测速)   │    │ (记账) │ │
│  └────┬─────┘    └────┬─────┘    └───┬───┘ │
│       │               │              │     │
│       ▼               ▼              ▼     │
│  ┌─────────────────────────────────────┐   │
│  │         lib/webdav.js              │   │
│  │    （WebDAV 公共同步模块）            │   │
│  └─────────────────┬───────────────────┘   │
│                    │                       │
│                    ▼                       │
│          fetch(/api/webdav?url=...)        │
└────────────────────┼──────────────────────┘
                     │
                     ▼
          ┌────────────────────┐
          │   proxy-server.js  │
          │   （Node.js 代理）  │
          │                    │
          │  转发请求到：       │
          │  · 坚果云 WebDAV   │
          │  · GitHub API      │
          └────────┬───────────┘
                   │
          ┌────────▼───────────┐
          │   云端存储          │
          │                    │
          │  /CCSyncNotes/     │
          │  ├─ notes.json    │
          │  ├─ todo.json     │
          │  └─ ledger.json   │
          └────────────────────┘
```

---

## 3. 文件结构

```
www/
├─ index.html              主壳 + 路由容器
├─ styles.css              全局样式
├─ app.js                  路由系统 + 工具注册
├─ lib/
│  └─ webdav.js            WebDAV 公共同步模块 ← 新建
└─ tools/
   ├─ sync-notes.js        文本同步工具（使用 webdav.js）
   ├─ speed-test.js        网络测速工具（不需要同步）
   └─ my-new-tool.js       你的新工具（使用 webdav.js）

proxy-server.js             开发时代理服务器（解决 CORS）
```

---

## 4. 代理服务器 & 跨环境处理（重点！）

### 4.1 代理服务器（仅用于开发）

文件：项目根目录的 `proxy-server.js`

这是一个 Node.js HTTP 服务器，同时提供两个功能：

1. **静态文件服务** — 提供 `www/` 目录下的 HTML/CSS/JS 文件
2. **API 代理** — 将 `/api/webdav` 和 `/api/github` 的请求转发到对应服务器，绕过 CORS

**注意：代理服务器仅在开发时使用！**

### 4.2 启动方式

```powershell
node proxy-server.js
# 或
npm run serve
```

启动后监听 `http://localhost:4173`。

### 4.3 代理端点

| 端点 | 用途 | 示例 |
| --- | --- | --- |
| `/api/webdav?url=<encoded>` | 转发到坚果云 WebDAV | `/api/webdav?url=https%3A//dav.jianguoyun.com/dav/CCSyncNotes/test.json` |
| `/api/github?url=<encoded>` | 转发到 GitHub API | `/api/github?url=https%3A//api.github.com/repos/...` |

### 4.4 代理工作流程（浏览器开发阶段）

```javascript
// 1. 浏览器发送请求（同源，无 CORS 问题）
fetch('/api/webdav?url=' + encodeURIComponent('https://dav.jianguoyun.com/dav/...'), {
  method: 'PUT',
  headers: { Authorization: 'Basic xxx' },
  body: JSON.stringify(data)
})

// 2. proxy-server.js 收到请求
// 3. 解析 url 参数得到目标地址
// 4. 将原始请求头和 body 转发给目标服务器
// 5. 收到响应后添加 CORS 头返回给浏览器
```

### 4.5 浏览器 vs 安卓：两套处理方式

| 环境 | CORS | 代理服务器 | 请求方式 |
|------|------|-----------|---------|
| 桌面浏览器开发 | 有 | 需要 | 走 `/api/webdav?url=...` 代理 |
| 安卓 APK | 无 | 不存在 | 直接请求真实地址 `https://dav.jianguoyun.com/...` |

**代码实现方式**（参考 [lib/webdav.js](file:///c:/Users/Administrator/Desktop/CC-A-speed/www/lib/webdav.js)）：

```javascript
// 检测安卓环境
const isAndroid = /Android/i.test(navigator.userAgent);

function requestUrl(url) {
  // 安卓直接请求
  if (isAndroid) {
    return url;
  }
  // 浏览器走代理
  return '/api/webdav?url=' + encodeURIComponent(url);
}
```

### 4.6 记住原则
1. 开发调试时：开启代理服务器，浏览器走代理
2. 打包进 APK 后：代码自动检测，安卓直接请求，代理服务器不需要参与
3. 所有涉及外部 API 的功能，必须在设计时就考虑到两套处理方式！

---

## 5. WebDAV 公共模块

### 5.1 模块设计

文件：`www/lib/webdav.js`

提供统一的 WebDAV 推送、拉取、文件夹管理能力，所有工具共用同一份代码。

### 5.2 API 说明

```javascript
window.CCWebdav = {

  // 初始化配置（每个工具调用一次即可）
  init(config),

  // 推送数据到云端
  // path: 相对于 base 的路径，如 "my-tool/data.json"
  // data: 要推送的 JS 对象（会被 JSON 化）
  push(path, data),

  // 从云端拉取数据
  // 返回: JS 对象，如果文件不存在返回 null
  pull(path),

  // 检查云端文件是否存在
  exists(path),

  // 删除云端文件
  remove(path),
}
```

### 5.3 配置参数

```javascript
CCWebdav.init({
  baseUrl: 'https://dav.jianguoyun.com/dav/CCSyncNotes',
  username: 'your@email.com',
  password: 'app-password'
});
```

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `baseUrl` | 是 | 坚果云 WebDAV 基础路径，所有工具共享同一个 |
| `username` | 是 | 坚果云注册邮箱 |
| `password` | 是 | 第三方应用密码（不是登录密码） |

---

## 6. 在工具中使用同步

### 6.1 最简用法

```javascript
// 1. 在工具的 init() 中初始化
function init() {
  CCWebdav.init({
    baseUrl: settings.webdavUrl,
    username: settings.webdavUser,
    password: settings.webdavPass
  });
}

// 2. 推送
await CCWebdav.push('my-tool/data.json', { items: [...], updatedAt: '...' });

// 3. 拉取
const data = await CCWebdav.pull('my-tool/data.json');
if (data) {
  // 使用云端数据
}
```

### 6.2 完整工具模板

以下是一个带同步功能的工具的完整模板：

```javascript
CCToolbox.register({
  id: 'my-tool',
  name: '我的工具',
  eyebrow: 'My Tool',
  icon: '🔧',
  description: '带 WebDAV 同步的工具示例',
  color: '#0f8b8d',

  render() {
    return `
      <section class="panel" aria-label="主面板">
        <!-- 你的工具界面 -->
      </section>
      <section class="panel-soft" aria-label="同步设置">
        <div class="section-heading">
          <h2>云端同步</h2>
          <span id="mt-syncStatus">未同步</span>
        </div>
        <div class="form-grid">
          <label>
            WebDAV 地址
            <input id="mt-webdavUrl" type="url"
                   placeholder="https://dav.jianguoyun.com/dav/CCSyncNotes">
          </label>
          <label>
            账号
            <input id="mt-webdavUser" type="email" placeholder="邮箱">
          </label>
          <label>
            应用密码
            <input id="mt-webdavPass" type="password" placeholder="应用密码">
          </label>
        </div>
        <div class="action-row">
          <button class="ghost-button" id="mt-saveConfig">保存</button>
          <button class="primary-button" id="mt-pushBtn">推送</button>
          <button class="ghost-button" id="mt-pullBtn">拉取</button>
        </div>
      </section>
    `;
  },

  init() {
    const q = (s) => document.querySelector(s);
    const els = {
      syncStatus: q('#mt-syncStatus'),
      webdavUrl: q('#mt-webdavUrl'),
      webdavUser: q('#mt-webdavUser'),
      webdavPass: q('#mt-webdavPass'),
      saveConfig: q('#mt-saveConfig'),
      pushBtn: q('#mt-pushBtn'),
      pullBtn: q('#mt-pullBtn')
    };

    const storageKey = 'cc-my-tool-data';
    const syncFile = 'my-tool/data.json';

    function loadLocal() {
      try {
        return JSON.parse(localStorage.getItem(storageKey)) || { items: [] };
      } catch { return { items: [] }; }
    }

    function saveLocal(data) {
      localStorage.setItem(storageKey, JSON.stringify(data));
    }

    function setStatus(text, error = false) {
      els.syncStatus.textContent = text;
      els.syncStatus.style.color = error ? 'var(--danger)' : 'var(--muted)';
    }

    function collectConfig() {
      return {
        baseUrl: els.webdavUrl.value.trim(),
        username: els.webdavUser.value.trim(),
        password: els.webdavPass.value
      };
    }

    // 保存配置 + 初始化 WebDAV
    els.saveConfig.addEventListener('click', () => {
      const cfg = collectConfig();
      if (!cfg.baseUrl || !cfg.username || !cfg.password) {
        setStatus('请填写完整的同步配置', true);
        return;
      }
      localStorage.setItem('cc-my-tool-sync', JSON.stringify(cfg));
      CCWebdav.init(cfg);
      setStatus('配置已保存');
    });

    // 恢复之前保存的配置
    const savedCfg = JSON.parse(localStorage.getItem('cc-my-tool-sync') || '{}');
    if (savedCfg.baseUrl) els.webdavUrl.value = savedCfg.baseUrl;
    if (savedCfg.username) els.webdavUser.value = savedCfg.username;
    if (savedCfg.password) els.webdavPass.value = savedCfg.password;
    if (savedCfg.baseUrl && savedCfg.username && savedCfg.password) {
      CCWebdav.init(savedCfg);
    }

    // 推送到云端
    els.pushBtn.addEventListener('click', async () => {
      const cfg = collectConfig();
      if (!cfg.baseUrl || !cfg.username || !cfg.password) {
        setStatus('请先保存同步配置', true);
        return;
      }
      CCWebdav.init(cfg);
      setStatus('正在推送...');
      els.pushBtn.disabled = true;
      try {
        const data = loadLocal();
        data.syncedAt = new Date().toISOString();
        await CCWebdav.push(syncFile, data);
        setStatus(`推送完成 ${new Date().toLocaleTimeString('zh-CN')}`);
      } catch (e) {
        setStatus(e.message || '推送失败', true);
      } finally {
        els.pushBtn.disabled = false;
      }
    });

    // 从云端拉取
    els.pullBtn.addEventListener('click', async () => {
      const cfg = collectConfig();
      if (!cfg.baseUrl || !cfg.username || !cfg.password) {
        setStatus('请先保存同步配置', true);
        return;
      }
      CCWebdav.init(cfg);
      setStatus('正在拉取...');
      els.pullBtn.disabled = true;
      try {
        const remoteData = await CCWebdav.pull(syncFile);
        if (remoteData) {
          saveLocal(remoteData);
          setStatus(`拉取完成`);
        } else {
          setStatus('云端无数据', true);
        }
      } catch (e) {
        setStatus(e.message || '拉取失败', true);
      } finally {
        els.pullBtn.disabled = false;
      }
    });
  },

  destroy() {}
});
```

### 6.3 关键注意事项

1. **初始化时机**：必须在调用 `push()` / `pull()` 之前调用 `CCWebdav.init()`
2. **路径规范**：使用 `工具名/文件名.json` 格式，避免不同工具冲突
3. **错误处理**：每次 push/pull 都要用 try-catch 包裹
4. **UI 反馈**：操作中禁用按钮，显示状态文字
5. **配置持久化**：将 WebDAV 配置存到 localStorage，下次打开自动恢复

---

## 7. 数据格式规范

### 7.1 推荐的统一备份格式

```javascript
{
  app: "cc-工具名",
  version: 1,
  exportedAt: "2026-05-26T10:30:00.000Z",
  data: {
    // 工具的实际数据放在这里
  }
}
```

好处：
- 用 `app` 字段标识来源工具
- 用 `version` 字段支持未来格式升级
- 用 `exportedAt` 记录导出时间
- 实际数据和元信息分离

### 7.2 各工具建议的文件路径

```
CCSyncNotes/
├─ notes.json          # 文本同步工具
├─ my-tool/
│  └─ data.json        # 我的工具
├─ todo/
│  └─ tasks.json       # 待办事项
├─ ledger/
│  └─ records.json     # 记账
└─ timer/
   └─ logs.json        # 倒计时记录
```

### 7.3 数据大小建议

| 场景 | 建议大小 | 说明 |
| --- | --- | --- |
| 单条笔记 | < 10KB | 普通文本完全够用 |
| 待办列表 | < 50KB | 几百条任务没问题 |
| 账本记录 | < 100KB | 一年的记录也够 |
| 总量上限 | < 500KB | 免费版流量充裕 |

超过 1MB 的数据建议分文件存储。

---

## 8. 完整代码示例

### 8.1 lib/webdav.js 完整实现

```javascript
window.CCWebdav = (function() {
  let config = {};

  function init(cfg) {
    config = {
      baseUrl: (cfg.baseUrl || '').replace(/\/+$/, ''),
      username: cfg.username || '',
      password: cfg.password || ''
    };
  }

  function encodeBase64(text) {
    const bytes = new TextEncoder().encode(text);
    const chars = [];
    bytes.forEach(b => chars.push(String.fromCharCode(b)));
    return btoa(chars.join(''));
  }

  function authHeader() {
    return 'Basic ' + encodeBase64(config.username + ':' + config.password);
  }

  function proxyUrl(url) {
    return '/api/webdav?url=' + encodeURIComponent(url);
  }

  function fileUrl(path) {
    const cleanPath = path.replace(/^\/+/, '');
    return config.baseUrl + '/' + cleanPath;
  }

  async function ensureFolder(folderPath) {
    const folderUrl = config.baseUrl + '/' + folderPath.replace(/^\/+/, '');
    try {
      const res = await fetch(proxyUrl(folderUrl + '/'), {
        method: 'PROPFIND',
        headers: { Authorization: authHeader(), Depth: '0' }
      });
      if (res.status === 404) {
        const createRes = await fetch(proxyUrl(folderUrl.endsWith('/') ? folderUrl : folderUrl + '/'), {
          method: 'MKCOL',
          headers: { Authorization: authHeader() }
        });
        if (!createRes.ok && createRes.status !== 405) {
          throw new Error('创建文件夹失败: HTTP ' + createRes.status);
        }
      }
    } catch (e) {
      if (!e.message.includes('创建文件夹')) throw e;
    }
  }

  async function push(path, data) {
    const url = fileUrl(path);
    const payload = JSON.stringify(data, null, 2);

    let res = await fetch(proxyUrl(url), {
      method: 'PUT',
      headers: {
        Authorization: authHeader(),
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: payload
    });

    if (res.status === 409) {
      const parts = path.split('/');
      parts.pop();
      await ensureFolder(parts.join('/'));
      res = await fetch(proxyUrl(url), {
        method: 'PUT',
        headers: {
          Authorization: authHeader(),
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: payload
      });
    }

    if (!res.ok) {
      throw new Error('推送失败: HTTP ' + res.status);
    }
  }

  async function pull(path) {
    const url = fileUrl(path);
    const res = await fetch(proxyUrl(url), {
      method: 'GET',
      headers: { Authorization: authHeader() }
    });

    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error('拉取失败: HTTP ' + res.status);
    }

    try {
      return await res.json();
    } catch {
      throw new Error('云端数据解析失败');
    }
  }

  async function exists(path) {
    const url = fileUrl(path);
    const res = await fetch(proxyUrl(url), {
      method: 'GET',
      headers: { Authorization: authHeader() }
    });
    return res.status === 200;
  }

  async function remove(path) {
    const url = fileUrl(path);
    const res = await fetch(proxyUrl(url), {
      method: 'DELETE',
      headers: { Authorization: authHeader() }
    });
    if (!res.ok && res.status !== 404) {
      throw new Error('删除失败: HTTP ' + res.status);
    }
  }

  return {
    init,
    push,
    pull,
    exists,
    remove
  };
})();
```

### 8.2 在 index.html 中引入

```html
<script src="lib/webdav.js"></script>
<script src="tools/sync-notes.js"></script>
<script src="tools/speed-test.js"></script>
<script src="tools/my-new-tool.js"></script>
<script src="app.js"></script>
```

注意：`webdav.js` 必须在所有使用它的工具脚本之前加载。

---

## 9. 常见问题

### Q：开发时必须启动代理服务器吗？

A：是的，桌面浏览器有 CORS 限制。但打包成安卓 APK 后，WebView 内不受此限制，可以直接请求坚果云。代理仅用于开发调试。

### Q：多个工具可以共用同一个坚果云账号吗？

A：可以，而且推荐这样做。只需要一个应用密码，所有工具共享。通过不同的文件路径区分数据。

### Q：数据会冲突吗？

A：只要每个工具用不同的文件路径就不会冲突。例如笔记用 `notes.json`，待办用 `todo/tasks.json`。

### Q：离线能用吗？

A：可以。数据优先存 localStorage（本地），有网络时再同步。这就是「本地优先」（local-first）的设计。

### Q：免费版流量够用吗？

A：纯文本数据非常小。假设你每天同步 10 次，每次 50KB，一个月也就 15MB，远低于 1GB 上传限额。

### Q：安全性如何？

A：传输层用 HTTPS 加密。应用密码是坚果云专门为第三方应用生成的，和登录密码独立。建议定期更换应用密码。

### Q：能同步图片吗？

A：技术上可以（转 Base64），但不推荐。免费版流量有限，且大文件同步慢。图片建议用其他方式存储。

---

## 10. 用户建议与修复记录

### 2026-05-26：自动创建嵌套文件夹 + 安卓代理自动检测

**问题**：用户在手机上配置同步并推送后，显示“推送成功”但坚果云上没有文件。原因在于：
1. 嵌套路径（如 `CCSyncNotes/my/data.json`）只会尝试创建一层文件夹，多级路径会失败
2. 安卓里没有本地代理服务器，但代码强制走代理请求

**解决方案**：
- 在 `www/lib/webdav.js` 中添加了 `isAndroid` 检测，安卓直接请求不使用代理
- 重写了文件夹创建逻辑，使用 `ensureFolderRecursive` 递归创建完整路径

**感谢用户**：感谢你提出的需求，让这个工具更加实用！

### 2026-05-26：sync-notes.js 坚果云推送修复 + 网络安全配置

**问题**：APK 打包后坚果云同步功能完全无法使用。原因：

1. `sync-notes.js` 中的 `proxyWebdav()` 和 `proxyGithub()` 函数**始终**走本地代理 `/api/webdav?url=...`，没有像 `lib/webdav.js` 那样检测安卓环境
2. 安卓 APK 中没有代理服务器，所以请求发到了 `https://localhost/api/webdav?url=...`（Capacitor 的 https scheme），必然失败
3. 缺少 `network_security_config.xml`，部分安卓版本可能会静默阻止 HTTPS 请求

**解决方案**：
- 在 `sync-notes.js` 中添加 `isAndroid` 检测，安卓环境下 `proxyWebdav()` 和 `proxyGithub()` 直接返回原始 URL
- 新增 `res/xml/network_security_config.xml` 并在 `AndroidManifest.xml` 中引用
- 确保所有涉及外部请求的工具都遵循「浏览器走代理，安卓直连」的原则

**教训**：`lib/webdav.js` 已经正确处理了安卓检测，但 `sync-notes.js` 没有使用公共模块，而是自己写了一套请求函数，导致遗漏了安卓适配。**所有工具应尽量复用 `lib/webdav.js` 公共模块。**

