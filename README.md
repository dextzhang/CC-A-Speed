# CC Sync Notes

一个用 HTML/CSS/JavaScript + Capacitor 做的安卓记事本原型。当前版本是本地优先设计，笔记默认保存在手机本地浏览器存储中，同步目标可以多选：

- 坚果云 WebDAV
- GitHub 仓库文件备份

## 已实现

- 新建、编辑、删除本地笔记
- 本地自动持久化
- 同步目标多选配置
- 坚果云 WebDAV 推送/拉取 JSON 备份
- GitHub Contents API 推送/拉取 JSON 备份
- 拉取时按 `updatedAt` 合并较新的笔记

## 需要你在坚果云准备的东西

| 项目 | 怎么做 | App 里填什么 |
| --- | --- | --- |
| 坚果云账号 | 使用现有账号即可 | 坚果云账号邮箱 |
| 同步目录 | 在坚果云根目录新建 `CCSyncNotes` | `https://dav.jianguoyun.com/dav/CCSyncNotes` |
| 应用密码 | 账户信息 -> 安全选项 -> 第三方应用管理 -> 添加应用密码 | 填到“应用密码”，不要填登录密码 |
| 备份文件名 | 默认即可 | `cc-notes-backup.json` |

注意：这个 Web 原型直接用 `fetch` 调 WebDAV。Android WebView 内通常可以测试实际效果，但桌面浏览器预览可能被 WebDAV 服务的 CORS 策略拦住。后续如果要做成更稳的正式版，建议加 Capacitor 原生 HTTP 插件或写一个很小的 Android 原生同步插件。

## GitHub 备份准备

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
cc-sync-notes-debug-apk
```

## 下一步建议

- 改用 Capacitor Preferences 或 SQLite 保存数据
- 加自动同步队列和失败重试
- 把 WebDAV/GitHub token 放进 Android Keystore
- 冲突时生成并展示冲突副本，而不是只按更新时间覆盖
- 支持把每条笔记导出为独立 Markdown 文件
