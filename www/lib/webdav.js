window.CCWebdav = (function() {
  var config = {};
  var isAndroid = /Android/i.test(navigator.userAgent);

  function init(cfg) {
    config = {
      baseUrl: (cfg.baseUrl || '').replace(/\/+$/, ''),
      username: cfg.username || '',
      password: cfg.password || ''
    };
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
      return url;
    }
    return '/api/webdav?url=' + encodeURIComponent(url);
  }

  function fileUrl(path) {
    var cleanPath = path.replace(/^\/+/, '');
    return config.baseUrl + '/' + cleanPath;
  }

  async function createFolder(folderUrl) {
    try {
      var createUrl = folderUrl.endsWith('/') ? folderUrl : folderUrl + '/';
      var createRes = await fetch(requestUrl(createUrl), {
        method: 'MKCOL',
        headers: { Authorization: authHeader() }
      });
      if (createRes.status !== 201 && createRes.status !== 405) {
        throw new Error('创建文件夹失败: HTTP ' + createRes.status);
      }
    } catch (e) {
      throw new Error('创建文件夹失败: ' + (e.message || e));
    }
  }

  async function ensureFolderRecursive(folderPath) {
    var parts = folderPath.replace(/^\/+|\/+$/g, '').split('/');
    var currentPath = '';

    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (!part) continue;
      if (currentPath) currentPath += '/';
      currentPath += part;

      var folderUrl = config.baseUrl + '/' + currentPath;
      var exists = false;

      try {
        var checkRes = await fetch(requestUrl(folderUrl + '/'), {
          method: 'PROPFIND',
          headers: { Authorization: authHeader(), Depth: '0' }
        });
        if (checkRes.ok || checkRes.status === 405) {
          exists = true;
        }
      } catch {}

      if (!exists) {
        await createFolder(folderUrl);
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

    var res = await fetch(requestUrl(url), {
      method: 'PUT',
      headers: {
        Authorization: authHeader(),
        'Content-Type': (typeof data === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8')
      },
      body: payload
    });

    if (res.status === 409) {
      var parts = path.split('/');
      parts.pop();
      if (parts.length > 0) {
        await ensureFolderRecursive(parts.join('/'));
        res = await fetch(requestUrl(url), {
          method: 'PUT',
          headers: {
            Authorization: authHeader(),
            'Content-Type': (typeof data === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8')
          },
          body: payload
        });
      }
    }

    if (!res.ok) {
      throw new Error('推送失败: HTTP ' + res.status);
    }
  }

  async function pull(path) {
    var url = fileUrl(path);
    var res = await fetch(requestUrl(url), {
      method: 'GET',
      headers: { Authorization: authHeader() }
    });

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
