window.CCWebdav = (function() {
  var config = {};

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

  function proxyUrl(url) {
    return '/api/webdav?url=' + encodeURIComponent(url);
  }

  function fileUrl(path) {
    var cleanPath = path.replace(/^\/+/, '');
    return config.baseUrl + '/' + cleanPath;
  }

  async function ensureFolder(folderPath) {
    var folderUrl = config.baseUrl + '/' + folderPath.replace(/^\/+/, '');
    try {
      var res = await fetch(proxyUrl(folderUrl + '/'), {
        method: 'PROPFIND',
        headers: { Authorization: authHeader(), Depth: '0' }
      });
      if (res.status === 404) {
        var createUrl = folderUrl.endsWith('/') ? folderUrl : folderUrl + '/';
        var createRes = await fetch(proxyUrl(createUrl), {
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
    var url = fileUrl(path);
    var payload = JSON.stringify(data, null, 2);

    var res = await fetch(proxyUrl(url), {
      method: 'PUT',
      headers: {
        Authorization: authHeader(),
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: payload
    });

    if (res.status === 409) {
      var parts = path.split('/');
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
    var url = fileUrl(path);
    var res = await fetch(proxyUrl(url), {
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
    var url = fileUrl(path);
    var res = await fetch(proxyUrl(url), {
      method: 'GET',
      headers: { Authorization: authHeader() }
    });
    return res.status === 200;
  }

  async function remove(path) {
    var url = fileUrl(path);
    var res = await fetch(proxyUrl(url), {
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
