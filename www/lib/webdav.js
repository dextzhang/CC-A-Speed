window.CCWebdav = (function() {
  var config = {};
  var isAndroid = /Android/i.test(navigator.userAgent);

  function init(cfg) {
    config = {
      baseUrl: (cfg.baseUrl || '').replace(/\/+$/, ''),
      username: cfg.username || '',
      password: cfg.password || ''
    };
    log('WebDAV init', { baseUrl: config.baseUrl, isAndroid });
  }

  function log(...args) {
    console.log('[CCWebdav]', ...args);
  }

  function encodeBase64(text) {
    var bytes = new TextEncoder().encode(text);
    var chars = [];
    bytes.forEach(function(b) { chars.push(String.fromCharCode(b)); });
    return btoa(chars.join(''));
  }

  function authHeader() {
    return 'Basic ' + encodeBase64(config.username + ':' + config.password);
  }

  function requestUrl(url) {
    if (isAndroid) {
      log('请求地址（安卓直接）', url);
      return url;
    }
    var proxyUrl = '/api/webdav?url=' + encodeURIComponent(url);
    log('请求地址（代理）', proxyUrl);
    return proxyUrl;
  }

  function fileUrl(path) {
    var cleanPath = path.replace(/^\/+/, '');
    return config.baseUrl + '/' + cleanPath;
  }

  async function createFolder(folderUrl) {
    log('创建文件夹', folderUrl);
    try {
      var createUrl = folderUrl.endsWith('/') ? folderUrl : folderUrl + '/';
      var createRes = await fetch(requestUrl(createUrl), {
        method: 'MKCOL',
        headers: { Authorization: authHeader() }
      });
      log('MKCOL 响应', createRes.status);
      if (createRes.status !== 201 && createRes.status !== 405) {
        throw new Error('创建文件夹失败: HTTP ' + createRes.status);
      }
    } catch (e) {
      throw new Error('创建文件夹失败: ' + (e.message || e));
    }
  }

  async function ensureFolderRecursive(folderPath) {
    if (isAndroid) {
      log('Android 环境跳过自动创建文件夹');
      return;
    }
    var parts = folderPath.replace(/^\/+|\/+$/g, '').split('/');
    var currentPath = '';

    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (!part) continue;
      if (currentPath) currentPath += '/';
      currentPath += part;

      var folderUrl = config.baseUrl + '/' + currentPath;
      log('检查文件夹', folderUrl);
      
      try {
        // 先用 MKCOL 创建（如果已存在会返回 405，不影响）
        var createUrl = folderUrl.endsWith('/') ? folderUrl : folderUrl + '/';
        var createRes = await fetch(requestUrl(createUrl), {
          method: 'MKCOL',
          headers: { Authorization: authHeader() }
        });
        log('文件夹 MKCOL', createRes.status);
      } catch (e) {
        // 忽略 MKCOL 错误（可能文件夹已存在）
        log('MKCOL 忽略错误', e);
      }
    }
  }

  async function push(path, data) {
    var url = fileUrl(path);
    var payload;
    if (typeof data === 'string') {
      payload = data;
    } else {
      payload = JSON.stringify(data, null, 2);
    }
    log('推送', path, payload.length, 'bytes');

    // 先确保父文件夹存在
    var parts = path.split('/');
    parts.pop();
    if (parts.length > 0) {
      await ensureFolderRecursive(parts.join('/'));
    }

    var res = await fetch(requestUrl(url), {
      method: 'PUT',
      headers: {
        Authorization: authHeader(),
        'Content-Type': (typeof data === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8')
      },
      body: payload
    });

    log('PUT 响应', res.status);

    if (!res.ok) {
      if (res.status === 409 && isAndroid) {
        throw new Error('云端同步目录不存在。由于安卓平台的网络限制，请先在坚果云网页版或客户端中手动创建该文件夹（如 ' + parts.join('/') + '），然后再进行同步。');
      }
      throw new Error('推送失败: HTTP ' + res.status);
    }
  }

  async function pull(path) {
    var url = fileUrl(path);
    log('拉取', path);
    var res = await fetch(requestUrl(url), {
      method: 'GET',
      headers: { Authorization: authHeader() }
    });

    log('GET 响应', res.status);

    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error('拉取失败: HTTP ' + res.status);
    }

    var text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  async function exists(path) {
    var url = fileUrl(path);
    var res = await fetch(requestUrl(url), {
      method: 'GET',
      headers: { Authorization: authHeader() }
    });
    return res.status === 200;
  }

  async function remove(path) {
    var url = fileUrl(path);
    var res = await fetch(requestUrl(url), {
      method: 'DELETE',
      headers: { Authorization: authHeader() }
    });
    if (!res.ok && res.status !== 404) {
      throw new Error('删除失败: HTTP ' + res.status);
    }
  }

  return {
    init: init,
    push: push,
    pull: pull,
    exists: exists,
    remove: remove
  };
})();
