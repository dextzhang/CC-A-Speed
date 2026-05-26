# CC 工具箱

一个用 HTML/CSS/JavaScript + Capacitor 做的安卓个人工具箱。首页以卡片方式展示所有小工具，点击进入对应工具页面，支持返回。当前包含以下工具：

- **网络测速** - 测试下载速度、上传速度、延迟和抖动
- **文本同步** - 本地笔记 + 坚果云 WebDAV / GitHub 同步备份

## 项目结构

```text
www/
├─ index.html              主壳：Topbar + 路由容器
├─ styles.css              全局样式 + 首页卡片 + 工具页通用样式
├─ app.js                  路由系统 + 工具注册 + 首页渲染
└─ tools/
   ├─ speed-test.js        网络测速工具模块
   └─ sync-notes.js        文本同步工具模块
android/                    Capacitor 生成的安卓工程
.github/workflows/          GitHub Actions 云打包配置
capacitor.config.json       App 名称、包名、Web 目录
package.json                Node 依赖和常用命令
```

## 架构说明

### SPA 单页应用 + Hash 路由

- `app.js` 实现了轻量 Hash 路由，首页路径 `#/`，工具路径 `#/speed-test`、`#/sync-notes`
- 每个工具通过 `CCToolbox.register()` 注册，注册信息包括 id、名称、图标、描述、颜色、render/init/destroy 方法
- 首页自动读取所有已注册工具，渲染为卡片网格
- 点击卡片导航到对应工具页，左上角返回按钮回到首页

### 工具模块规范

每个工具模块是一个独立 JS 文件，放在 `www/tools/` 目录下，结构如下：

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

### 添加新工具的步骤

1. 在 `www/tools/` 下新建 JS 文件，例如 `my-tool.js`
2. 按上述规范调用 `CCToolbox.register()` 注册工具
3. 在 `www/index.html` 的 `<script>` 标签中引入新文件（在 `app.js` 之前）
4. 本地预览确认功能正常

## 网络测速

- 使用 Cloudflare Speed Test 端点测试下载和上传速度
- 延迟测量：5 次 HTTP 请求取中位数
- 下载测试：依次下载 10MB / 5MB / 2.5MB 测速文件
- 上传测试：上传 2MB 随机数据
- 测速结果保存在本地，最多保留 20 条记录

## 文本同步

- 新建、编辑、删除本地笔记
- 本地自动持久化（localStorage）
- 同步目标多选配置：坚果云 WebDAV / GitHub 仓库文件备份
- 拉取时按 `updatedAt` 合并较新的笔记

### 坚果云 WebDAV 准备

| 项目 | 怎么做 | App 里填什么 |
| --- | --- | --- |
| 坚果云账号 | 使用现有账号即可 | 坚果云账号邮箱 |
| 同步目录 | 在坚果云根目录新建 `CCSyncNotes` | `https://dav.jianguoyun.com/dav/CCSyncNotes` |
| 应用密码 | 账户信息 -> 安全选项 -> 第三方应用管理 -> 添加应用密码 | 填到"应用密码"，不要填登录密码 |
| 备份文件名 | 默认即可 | `cc-notes-backup.json` |

注意：WebDAV 直接用 `fetch` 调用。Android WebView 内通常可以测试实际效果，但桌面浏览器预览可能被 WebDAV 服务的 CORS 策略拦住。

### GitHub 备份准备

| 项目 | 建议 |
| --- | --- |
| 仓库 | 新建一个私有仓库，例如 `notes-backup` |
| 文件路径 | 默认 `cc-notes-backup.json` |
| Token | Fine-grained personal access token，只给目标仓库 Contents: Read and write |
| 分支 | 默认 `main` |

## 本地预览

```powershell
npm.cmd install --cache .npm-cache
npm.cmd run serve
```

打开：

```text
http://127.0.0.1:4173
```

## 同步到安卓工程

修改 `www/` 后执行：

```powershell
npm.cmd run cap:sync
```

## GitHub Actions 云打包

仓库包含：

```text
.github/workflows/android-debug-apk.yml
```

推送到 `main` 后会自动构建 debug APK。构建产物名称：

```text
cc-toolbox-debug-apk
```

## 云打包推送速查

```powershell
git add .
git commit -m "feat: update toolbox"
git push origin main
```

## 下一步建议

- 改用 Capacitor Preferences 或 SQLite 保存数据
- 加自动同步队列和失败重试
- 把 WebDAV/GitHub token 放进 Android Keystore
- 冲突时生成并展示冲突副本
- 支持把每条笔记导出为独立 Markdown 文件
- 添加更多工具：待办清单、记账、倒计时、汇率换算等
