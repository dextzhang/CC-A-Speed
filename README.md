# CC A Speed

一个最小化的安卓测速学习项目：前端使用纯 HTML/CSS/JavaScript，安卓打包使用 Capacitor。

## 项目结构

- `www/index.html`：测速 App 页面
- `www/styles.css`：界面样式
- `www/app.js`：测速逻辑
- `capacitor.config.json`：Capacitor 安卓壳配置
- `package.json`：依赖和脚本

## 本地预览

```powershell
npm install
npm run serve
```

然后打开：

```text
http://localhost:4173
```

如果 PowerShell 提示 `npm.ps1` 被禁止执行，把上面的 `npm` 换成 `npm.cmd`：

```powershell
npm.cmd install --cache .npm-cache
npm.cmd run serve
```

## 生成安卓工程

```powershell
npm install
npm run cap:add:android
npm run cap:sync
npm run cap:open
```

打开 Android Studio 后，连接手机或启动模拟器，点击 Run 即可安装测试。

## GitHub Actions 云打包 APK

项目已包含：

```text
.github/workflows/android-debug-apk.yml
```

把项目推送到 GitHub 的 `main` 分支后，GitHub 会自动构建 debug APK。也可以在仓库页面手动运行：

```text
Actions -> Build Android Debug APK -> Run workflow
```

构建完成后，在对应的 workflow run 页面下载 artifact：

```text
cc-a-speed-debug-apk
```

里面的 `app-debug.apk` 可以安装到 Android 手机上测试。Debug APK 适合自测；正式发布还需要 release 签名。

## 学习重点

第一版故意保持简单，主要帮助你理解：

- Web 页面如何变成 Android App
- Capacitor 项目的基本文件结构
- JavaScript 如何发起测速请求
- Android Studio 如何打包和安装 APK

测速默认使用 Cloudflare 的公开测速端点。实际测速结果会受到网络、测试服务器、浏览器/WebView 限制影响，适合学习流程，不等同于专业测速平台。
