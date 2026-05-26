# CC 安卓开发流程

这份文档记录我们用"前端技术栈 + Capacitor + GitHub Actions 云打包"开发安卓小工具的完整流程。以后你想做自己的安卓小应用，可以按这套流程复用。

## 1. 这套方案适合什么

适合用来开发轻量安卓小工具，例如：

- 网络测速工具
- 计算器、倒计时、记账、清单
- 个人资料库、收藏夹、离线文档
- 调用 API 的小应用，比如 AI 工具、翻译、OCR、天气查询
- 简单表单、仪表盘、配置面板
- 个人工具箱（多个小工具集合）

这套方案的核心思路是：

```text
HTML/CSS/JavaScript 写界面和逻辑
        ↓
Capacitor 把 Web 应用包进 Android 壳
        ↓
GitHub Actions 云端安装 JDK/Android SDK 并生成 APK
        ↓
手机下载 APK 安装运行
```

你本地不一定要安装 Android Studio，也可以通过 GitHub Actions 云端打包。

## 2. 需要准备的东西

本地电脑需要：

- Node.js
- npm
- Git
- 一个 GitHub 账号
- 一个 GitHub 仓库

云端打包由 GitHub Actions 完成，它会自动准备：

- Linux 构建环境
- Node.js
- JDK
- Android Gradle 构建环境

如果以后想在本地直接打 APK，还需要额外安装：

- JDK
- Android Studio 或 Android SDK

## 3. 项目结构

CC 工具箱项目结构：

```text
项目目录/
├─ www/
│  ├─ index.html              主壳：Topbar + 路由容器
│  ├─ styles.css              全局样式 + 首页卡片 + 工具页通用样式
│  ├─ app.js                  路由系统 + 工具注册 + 首页渲染
│  └─ tools/
│     ├─ speed-test.js        网络测速工具模块
│     └─ sync-notes.js        文本同步工具模块
├─ android/                   Capacitor 生成的安卓工程
├─ .github/
│  └─ workflows/
│     └─ android-debug-apk.yml
├─ capacitor.config.json      App 名称、包名、Web 目录
├─ package.json               Node 依赖和常用命令
├─ package-lock.json
├─ .gitignore
├─ README.md
├─ CC安卓小工具界面设计规范.md
└─ CC安卓开发流程.md
```

各部分作用：

- `www/`：真正的前端代码
  - `index.html` + `styles.css` + `app.js`：工具箱主壳和路由
  - `tools/`：各工具的独立模块，每个工具一个 JS 文件
- `android/`：Capacitor 生成的安卓工程
- `.github/workflows/`：GitHub Actions 云打包配置
- `capacitor.config.json`：App 名称、包名、Web 目录配置
- `package.json`：Node 依赖和常用命令

## 4. 架构：SPA + Hash 路由 + 工具模块化

### 路由系统

- 使用 Hash 路由：`#/` 首页，`#/speed-test` 网络测速，`#/sync-notes` 文本同步
- `app.js` 中的 `router` 对象负责路由解析和页面渲染
- 首页自动读取所有已注册工具，渲染为卡片网格
- 工具页显示返回按钮，点击回到首页

### 工具注册

每个工具通过 `CCToolbox.register()` 注册：

```js
CCToolbox.register({
  id: 'tool-id',
  name: '工具名称',
  eyebrow: '英文小标签',
  icon: '📱',
  description: '简短描述',
  color: '#0f8b8d',
  render() { return '<html>'; },
  init() { /* 绑定事件 */ },
  destroy() { /* 清理 */ }
});
```

### 添加新工具

1. 在 `www/tools/` 下新建 JS 文件
2. 按上述规范调用 `CCToolbox.register()` 注册
3. 在 `www/index.html` 中添加 `<script src="tools/新工具.js"></script>`（在 `app.js` 之前）
4. 本地预览确认功能正常

## 5. 从零创建项目

新建项目目录：

```powershell
mkdir CC-My-App
cd CC-My-App
```

初始化 npm：

```powershell
npm.cmd init -y
```

安装 Capacitor：

```powershell
npm.cmd install @capacitor/core @capacitor/android
npm.cmd install -D @capacitor/cli http-server
```

如果 PowerShell 提示 `npm.ps1` 被禁止执行，用 `npm.cmd` 替代 `npm`。

如果 npm 缓存目录权限报错，可以把缓存放到项目内：

```powershell
npm.cmd install --cache .npm-cache
```

## 6. 创建前端代码

创建 `www` 目录：

```powershell
mkdir www
mkdir www\tools
```

核心文件：

```text
www/index.html          主壳
www/styles.css          全局样式
www/app.js              路由 + 工具注册
www/tools/xxx.js        各工具模块
```

## 7. 配置 package.json

可以在 `package.json` 里放这些脚本：

```json
{
  "scripts": {
    "serve": "npx http-server www -p 4173",
    "cap:add:android": "npx cap add android",
    "cap:sync": "npx cap sync android",
    "cap:open": "npx cap open android"
  }
}
```

本地预览：

```powershell
npm.cmd run serve
```

浏览器打开：

```text
http://127.0.0.1:4173
```

## 8. 配置 Capacitor

创建 `capacitor.config.json`：

```json
{
  "appId": "com.cctoolbox.app",
  "appName": "CC 工具箱",
  "webDir": "www",
  "server": {
    "androidScheme": "https"
  }
}
```

字段说明：

- `appId`：安卓包名，建议用反向域名格式
- `appName`：手机上显示的应用名称
- `webDir`：前端文件目录，这里是 `www`

注意：每个 App 的 `appId` 最好唯一。

## 9. 生成 Android 工程

第一次创建安卓工程：

```powershell
npm.cmd run cap:add:android
```

之后每次修改 `www/` 前端代码后，同步到安卓工程：

```powershell
npm.cmd run cap:sync
```

## 10. Android 网络权限

如果 App 要访问网络，确认这个文件里有网络权限：

```text
android/app/src/main/AndroidManifest.xml
```

需要包含：

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

## 11. 配置 .gitignore

建议 `.gitignore` 包含：

```text
node_modules/
.npm-cache/
.gradle/

android/.gradle/
android/build/
android/app/build/

*.apk
*.aab
local.properties
serve.log
```

## 12. 配置 GitHub Actions 云打包

创建文件：

```text
.github/workflows/android-debug-apk.yml
```

内容：

```yaml
name: Build Android Debug APK

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  build-debug-apk:
    name: Build debug APK
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Set up JDK
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 21

      - name: Install dependencies
        run: npm ci

      - name: Sync Capacitor Android assets
        run: npx cap sync android

      - name: Make Gradle executable
        run: chmod +x android/gradlew

      - name: Build debug APK
        working-directory: android
        run: ./gradlew assembleDebug

      - name: Upload APK artifact
        uses: actions/upload-artifact@v4
        with:
          name: cc-toolbox-debug-apk
          path: android/app/build/outputs/apk/debug/app-debug.apk
          if-no-files-found: error
```

## 13. 推送到 GitHub

第一次推送：

```powershell
git init
git add .
git commit -m "feat: add toolbox"
git branch -M main
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

以后修改代码后：

```powershell
git add .
git commit -m "feat: update toolbox"
git push
```

每次推送到 `main` 分支，GitHub Actions 都会自动重新打包 APK。

## 14. 在 GitHub 下载 APK

打开 GitHub 仓库页面，进入 Actions，找到最新的构建记录，下载 Artifacts。

## 15. 手动触发云打包

进入 GitHub 仓库：

```text
Actions -> Build Android Debug APK -> Run workflow
```

## 16. 手机安装注意事项

Debug APK 不是应用商店正式包，手机可能会提示未知来源应用。需要在手机设置里允许安装未知应用。

## 17. 每次修改后的标准流程

```text
修改 www/ 下的代码
本地浏览器预览
确认功能可用
git add .
git commit
git push
GitHub Actions 自动打包
下载 app-debug.apk
手机安装测试
```

对应命令：

```powershell
npm.cmd run serve
git add .
git commit -m "feat: update toolbox"
git push
```

## 18. 什么时候需要重新执行 cap sync

云端 workflow 已经包含 `npx cap sync android`，所以 GitHub 云打包时会自动同步。

本地开发时，如果想打开 Android Studio 或本地打包，需要手动执行：

```powershell
npm.cmd run cap:sync
```

## 19. 本地打包 APK

如果以后你安装了 JDK 和 Android Studio，可以本地打包：

```powershell
npm.cmd run cap:sync
$env:GRADLE_USER_HOME='当前项目目录\.gradle'
.\android\gradlew.bat assembleDebug
```

生成位置：

```text
android\app\build\outputs\apk\debug\app-debug.apk
```

## 20. 后续可以扩展的能力

Capacitor 可以继续加入插件，让 Web 小工具调用安卓能力，例如：

- 相机
- 相册
- 文件系统
- 剪贴板
- 定位
- 本地通知
- 状态栏
- 启动画面
- 设备信息

## 21. 做新工具时最重要的几个修改点

1. 在 `www/tools/` 下新建 JS 文件
2. 调用 `CCToolbox.register()` 注册工具
3. 在 `www/index.html` 中添加 `<script>` 引入
4. 实现工具的 `render()`、`init()`、`destroy()` 方法

## 22. 云打包推送速查

三步完成：

```powershell
git add .
git commit -m "feat: update toolbox"
git push origin main
```

## 23. 常见执行错误

### PowerShell 不支持 &&

PowerShell 5 中 `&&` 不是合法语法，用分号替代：

```powershell
cd c:\Users\xxx\project; git status
```

### git push 偶尔失败先重试

遇到连接重置等错误时，先重试一次再判断。

### 不要过度诊断网络

如果 `git push` 失败：重试 → 检查代理 → 考虑网络环境。不要在第一步失败时就跑一堆诊断工具。

## 24. 一句话总结

以后你要做自己的安卓小工具，可以按这个模式走：

```text
用前端技术写功能
用 CCToolbox.register() 注册到工具箱
用 Capacitor 生成安卓壳
把项目推送到 GitHub
让 GitHub Actions 云端打包 APK
手机下载 APK 安装测试
```

这就是一条非常轻量、适合个人开发和 AI 辅助开发的安卓小应用路线。
