# CC 安卓开发流程

这份文档记录我们这次用“前端技术栈 + Capacitor + GitHub Actions 云打包”开发安卓小工具的完整流程。以后你想做自己的安卓小应用，可以按这套流程复用。

## 1. 这套方案适合什么

适合用来开发轻量安卓小工具，例如：

- 网络测速工具
- 计算器、倒计时、记账、清单
- 个人资料库、收藏夹、离线文档
- 调用 API 的小应用，比如 AI 工具、翻译、OCR、天气查询
- 简单表单、仪表盘、配置面板

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

## 3. 推荐项目结构

一个最小安卓小工具项目可以这样组织：

```text
项目目录/
├─ www/
│  ├─ index.html
│  ├─ styles.css
│  └─ app.js
├─ android/
├─ .github/
│  └─ workflows/
│     └─ android-debug-apk.yml
├─ capacitor.config.json
├─ package.json
├─ package-lock.json
├─ .gitignore
└─ README.md
```

各部分作用：

- `www/`：真正的小工具前端代码
- `android/`：Capacitor 生成的安卓工程
- `.github/workflows/`：GitHub Actions 云打包配置
- `capacitor.config.json`：App 名称、包名、Web 目录配置
- `package.json`：Node 依赖和常用命令

## 4. 从零创建项目

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

## 5. 创建前端小工具

创建 `www` 目录：

```powershell
mkdir www
```

最少需要三个文件：

```text
www/index.html
www/styles.css
www/app.js
```

以后开发小工具时，主要改这三个文件。

典型职责：

- `index.html`：页面结构
- `styles.css`：手机端界面样式
- `app.js`：功能逻辑、数据存储、网络请求

## 6. 配置 package.json

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

如果只是纯静态页面，也可以直接打开：

```text
项目目录\www\index.html
```

## 7. 配置 Capacitor

创建 `capacitor.config.json`：

```json
{
  "appId": "com.example.myapp",
  "appName": "My App",
  "webDir": "www",
  "server": {
    "androidScheme": "https"
  }
}
```

字段说明：

- `appId`：安卓包名，建议用反向域名格式，例如 `com.cc.mytool`
- `appName`：手机上显示的应用名称
- `webDir`：前端文件目录，这里是 `www`

注意：每个 App 的 `appId` 最好唯一。以后做新工具时，不要所有项目都用同一个包名。

## 8. 生成 Android 工程

第一次创建安卓工程：

```powershell
npm.cmd run cap:add:android
```

之后每次修改 `www/` 前端代码后，同步到安卓工程：

```powershell
npm.cmd run cap:sync
```

Capacitor 会把 `www/` 里的文件复制到：

```text
android/app/src/main/assets/public
```

安卓 App 实际运行时，就是在 WebView 里加载这些前端文件。

## 9. Android 网络权限

如果 App 要访问网络，确认这个文件里有网络权限：

```text
android/app/src/main/AndroidManifest.xml
```

需要包含：

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

我们这次的测速工具已经自动包含了这项权限。

## 10. 配置 .gitignore

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

不要把 `node_modules`、缓存、APK 构建产物提交到 GitHub。

要提交的是源码、配置、`package-lock.json`、`android/` 工程。

## 11. 配置 GitHub Actions 云打包

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
          name: cc-android-debug-apk
          path: android/app/build/outputs/apk/debug/app-debug.apk
          if-no-files-found: error
```

这个 workflow 做的事情：

1. 拉取 GitHub 仓库代码
2. 安装 Node.js
3. 安装 JDK 21
4. 用 `npm ci` 安装依赖
5. 用 `npx cap sync android` 同步前端文件
6. 用 Gradle 构建 debug APK
7. 把 APK 上传成 GitHub artifact

## 12. 推送到 GitHub

第一次推送：

```powershell
git init
git add .
git commit -m "feat: add android app"
git branch -M main
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

以后修改代码后：

```powershell
git add .
git commit -m "feat: update app"
git push
```

每次推送到 `main` 分支，GitHub Actions 都会自动重新打包 APK。

## 13. 在 GitHub 下载 APK

打开 GitHub 仓库页面：

```text
https://github.com/你的用户名/你的仓库名
```

进入：

```text
Actions
```

找到：

```text
Build Android Debug APK
```

点进最新的一次运行记录。

如果成功，会看到绿色成功标记。

页面下方有：

```text
Artifacts
```

下载：

```text
cc-android-debug-apk
```

解压后得到：

```text
app-debug.apk
```

把这个 APK 发到手机上，即可安装测试。

## 14. 手动触发云打包

除了 `git push` 自动触发，也可以手动触发。

进入 GitHub 仓库：

```text
Actions -> Build Android Debug APK -> Run workflow
```

选择 `main` 分支，点击运行。

这适合你没有新提交，但想重新生成 APK 的情况。

## 15. 手机安装注意事项

Debug APK 不是应用商店正式包，手机可能会提示：

- 未知来源应用
- 此应用来自外部来源
- 是否允许安装

需要在手机设置里允许当前文件管理器、浏览器或聊天软件安装未知应用。

Debug APK 适合自己测试和分享给少量设备试用。

正式发布应用商店时，需要改成 release 包，并配置签名文件。

## 16. 每次修改小工具后的标准流程

以后你改一个小工具，最常用流程是：

```text
修改 www/index.html
修改 www/styles.css
修改 www/app.js
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
git commit -m "feat: update tool"
git push
```

如果本地不预览，也可以直接改完后推送，让 GitHub 生成 APK。

## 17. 什么时候需要重新执行 cap sync

云端 workflow 已经包含：

```powershell
npx cap sync android
```

所以 GitHub 云打包时会自动同步前端文件。

本地开发时，如果你想打开 Android Studio 或本地打包，需要手动执行：

```powershell
npm.cmd run cap:sync
```

简单理解：

- 只用 GitHub Actions 打包：workflow 会自动 sync
- 本地 Android Studio 调试：自己先 run `cap:sync`

## 18. 本地打包 APK

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

如果报错：

```text
JAVA_HOME is not set
```

说明本机没有配置 JDK，需要安装 JDK 或 Android Studio。

## 19. Debug 包和正式包的区别

Debug APK：

- 适合自己安装测试
- GitHub Actions 可以直接生成
- 不适合正式上架
- 签名是调试签名

Release APK/AAB：

- 适合正式发布
- 需要 release 签名
- 需要保护 keystore 文件
- 上架 Google Play 通常需要 AAB

我们当前流程先使用 debug APK，因为它最轻量，最适合学习和个人工具。

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

常见安装方式类似：

```powershell
npm.cmd install @capacitor/camera
npm.cmd run cap:sync
```

具体插件要看需求再选。

## 21. 做新 App 时最重要的几个修改点

复制旧项目做新 App 时，至少要改：

1. `capacitor.config.json` 里的 `appId`
2. `capacitor.config.json` 里的 `appName`
3. `package.json` 里的 `name`
4. `www/` 里的界面和逻辑
5. GitHub Actions artifact 名称，可选
6. App 图标和启动图，可后续优化

尤其注意 `appId`。

例如：

```json
{
  "appId": "com.cc.todo",
  "appName": "CC Todo",
  "webDir": "www"
}
```

## 22. 我们这次项目的实际仓库

本次测速工具仓库：

```text
https://github.com/dextzhang/CC-A-Speed
```

本次项目云打包入口：

```text
https://github.com/dextzhang/CC-A-Speed/actions
```

下载 APK 的位置：

```text
Actions -> Build Android Debug APK -> 最新运行记录 -> Artifacts
```

## 23. 一句话总结

以后你要做自己的安卓小工具，可以按这个模式走：

```text
用前端技术写功能
用 Capacitor 生成安卓壳
把项目推送到 GitHub
让 GitHub Actions 云端打包 APK
手机下载 APK 安装测试
```

这就是一条非常轻量、适合个人开发和 AI 辅助开发的安卓小应用路线。

## 24. 云打包推送速查

三步完成，不需要多余操作：

```powershell
git add .
git commit -m "feat: update app"
git push origin main
```

推送后去 GitHub Actions 页面查看构建状态，构建成功后下载 APK。

## 25. 常见执行错误

### PowerShell 不支持 &&

PowerShell 5 中 `&&` 不是合法语法，会报错：

```text
标记"&&"不是此版本中的有效语句分隔符
```

正确写法用分号：

```powershell
cd c:\Users\xxx\project; git status
```

或者直接省略 `cd`，用 `-cwd` 参数指定目录。

### git push 偶尔失败先重试

`git push` 遇到以下错误时，先重试一次再判断：

```text
fatal: unable to access '...': Recv failure: Connection was reset
fatal: unable to access '...': Failed to connect to ... port 443
```

大多数情况是临时网络波动，重试即可通过。不要立刻去跑 ping、curl 等诊断命令，那只会浪费时间。

### 不要过度诊断网络

如果 `git push` 失败：

1. 重试一次
2. 仍然失败 → 检查是否需要配置代理
3. 配了代理仍失败 → 再考虑网络环境问题

不要在第一步失败时就跑一堆网络诊断工具。
