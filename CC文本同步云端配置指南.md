# CC 文本同步 - 云端配置指南

本文档详细说明如何在「CC 工具箱 - 文本同步」工具中配置坚果云 WebDAV 和 GitHub 两种云端同步方式。

---

## 目录

1. [同步方式概览](#1-同步方式概览)
2. [坚果云 WebDAV 配置](#2-坚果云-webdav-配置)
3. [GitHub 备份配置](#3-github-备份配置)
4. [同步操作说明](#4-同步操作说明)
5. [常见问题](#5-常见问题)

---

## 1. 同步方式概览

文本同步工具支持两种同步目标，可以同时启用：

| 同步方式 | 适合场景 | 费用 | 数据存储位置 |
| --- | --- | --- | --- |
| 坚果云 WebDAV | 个人日常同步，操作简单 | 免费版每月 1GB 上传流量 | 坚果云服务器 |
| GitHub 仓库文件 | 开发者备份，版本可追溯 | 免费（私有仓库） | GitHub 服务器 |

两种方式互不冲突，可以同时勾选启用。推送时会同时推送到所有已启用的目标，拉取时会从所有目标合并数据。

---

## 2. 坚果云 WebDAV 配置

### 2.1 注册坚果云账号

如果还没有坚果云账号：

1. 访问 [坚果云官网](https://www.jianguoyun.com/)
2. 点击注册，使用邮箱注册一个账号
3. 登录坚果云网页版

### 2.2 创建同步目录

1. 登录坚果云网页版后，进入「我的文件」
2. 在根目录下新建文件夹，命名为 `CCSyncNotes`
3. 这个文件夹就是同步笔记的存放位置

### 2.3 生成应用密码

⚠️ **重要：不要使用坚果云的登录密码，必须使用应用密码。**

1. 登录坚果云网页版
2. 点击右上角头像 → 「账户信息」
3. 选择「安全选项」标签页
4. 找到「第三方应用管理」
5. 点击「添加应用密码」
6. 输入一个名称，例如 `CC工具箱`
7. 点击生成，系统会给出一个应用密码
8. **立即复制保存这个密码，它只显示一次**

### 2.4 在 App 中填写配置

打开 CC 工具箱 → 文本同步 → 同步目标区域：

| 配置项 | 填写内容 | 示例 |
| --- | --- | --- |
| 勾选「坚果云 WebDAV」 | ✅ 打勾 | |
| WebDAV 地址 | 坚果云 WebDAV 地址 + 文件夹名 | `https://dav.jianguoyun.com/dav/CCSyncNotes` |
| 坚果云账号 | 注册时使用的邮箱 | `yourname@example.com` |
| 应用密码 | 第 2.3 步生成的应用密码 | `xxxxxxxxxxxx` |
| 备份文件名 | 备份文件名称，默认即可 | `cc-notes-backup.json` |

### 2.5 WebDAV 地址说明

坚果云的 WebDAV 基础地址是：

```text
https://dav.jianguoyun.com/dav/
```

如果你在坚果云根目录创建了 `CCSyncNotes` 文件夹，完整地址就是：

```text
https://dav.jianguoyun.com/dav/CCSyncNotes
```

如果你使用了其他文件夹名称，替换 `CCSyncNotes` 为你的文件夹名即可。

### 2.6 验证配置

1. 填写完所有配置后，点击「保存配置」
2. 点击「推送备份」
3. 如果状态显示「推送完成」，说明配置正确
4. 可以登录坚果云网页版，进入 `CCSyncNotes` 文件夹，查看是否生成了 `cc-notes-backup.json` 文件

---

## 3. GitHub 备份配置

### 3.1 创建 GitHub 仓库

1. 登录 [GitHub](https://github.com/)
2. 点击右上角 `+` → 「New repository」
3. 填写仓库信息：
   - Repository name：例如 `notes-backup`
   - 选择 **Private**（私有仓库，保护笔记数据）
   - 不要勾选 Initialize with README
4. 点击「Create repository」

### 3.2 生成 Fine-grained Token

⚠️ **重要：不要使用经典 Token，必须使用 Fine-grained token，权限更安全。**

1. 登录 GitHub，点击右上角头像 → 「Settings」
2. 左侧菜单滚动到底部，点击「Developer settings」
3. 选择「Fine-grained tokens」标签页
4. 点击「Generate new token」
5. 填写 Token 信息：

| 字段 | 填写内容 |
| --- | --- |
| Token name | `CC工具箱备份` |
| Expiration | 选择一个较长的有效期，例如 90 天或 1 年 |
| Repository access | 选择「Only select repositories」 |
| Select repositories | 选择第 3.1 步创建的仓库 |

6. 设置权限：
   - 在「Permissions」→「Repository permissions」中
   - 找到「Contents」
   - 设置为 **Read and write**
7. 点击「Generate token」
8. **立即复制保存这个 Token，它只显示一次**

### 3.3 在 App 中填写配置

打开 CC 工具箱 → 文本同步 → 同步目标区域：

| 配置项 | 填写内容 | 示例 |
| --- | --- | --- |
| 勾选「GitHub 备份」 | ✅ 打勾 | |
| Owner | GitHub 用户名 | `dextzhang` |
| Repo | 仓库名称 | `notes-backup` |
| Branch | 分支名称 | `main` |
| 文件路径 | 备份文件在仓库中的路径 | `cc-notes-backup.json` |
| Fine-grained token | 第 3.2 步生成的 Token | `github_pat_xxxxxxxxxxxx` |

### 3.4 配置项说明

- **Owner**：你的 GitHub 用户名，不是邮箱。在 GitHub 个人主页的 URL 中可以看到，例如 `https://github.com/dextzhang` 中的 `dextzhang`
- **Repo**：仓库名称，就是第 3.1 步创建的仓库名
- **Branch**：通常是 `main`，如果你改过默认分支名就填对应的
- **文件路径**：备份文件在仓库中的路径。如果只想放在仓库根目录，直接填文件名即可

### 3.5 验证配置

1. 填写完所有配置后，点击「保存配置」
2. 点击「推送备份」
3. 如果状态显示「推送完成」，说明配置正确
4. 可以在 GitHub 仓库页面查看是否生成了 `cc-notes-backup.json` 文件

---

## 4. 同步操作说明

### 4.1 保存配置

修改任何同步配置后，点击「保存配置」按钮。配置会保存在手机本地，下次打开不需要重新填写。

### 4.2 推送备份

点击「推送备份」会将当前所有本地笔记打包推送到已启用的同步目标。

- 推送会覆盖云端已有的备份文件
- 推送前会自动保存当前正在编辑的笔记
- 如果同时启用了 WebDAV 和 GitHub，两个目标都会推送

### 4.3 拉取合并

点击「拉取合并」会从已启用的同步目标拉取备份，并与本地笔记合并。

合并规则：

- 按 `updatedAt` 时间戳比较
- 如果远端笔记比本地新，用远端版本覆盖本地
- 如果本地笔记比远端新，保留本地版本
- 如果远端有本地不存在的笔记，添加到本地
- 不会删除本地已有的笔记

### 4.4 推荐使用流程

```text
在手机 A 上写笔记 → 推送备份 → 在手机 B 上拉取合并 → 继续编辑 → 推送备份
```

建议：

- 换设备前先推送
- 在新设备上先拉取
- 不要同时在两个设备上编辑同一条笔记

---

## 5. 常见问题

### Q：桌面浏览器预览时 WebDAV 推送失败

A：桌面浏览器有 CORS 跨域限制，WebDAV 请求可能被拦截。在安卓 App 内使用不受此限制。如果需要在桌面测试，可以安装浏览器 CORS 插件临时关闭限制。

### Q：GitHub 推送返回 403 错误

A：可能的原因：

1. Token 权限不足 → 确认 Token 的 Contents 权限是「Read and write」
2. Token 过期 → 重新生成一个新 Token
3. API 限流 → 等待一段时间后重试

### Q：GitHub 推送返回 404 错误

A：检查 Owner 和 Repo 是否填写正确，确认仓库确实存在。

### Q：拉取合并后笔记没有更新

A：如果本地笔记的 `updatedAt` 时间比远端新，拉取时不会覆盖。这是正常的合并行为。

### Q：坚果云免费版有什么限制

A：免费版每月上传流量 1GB，下载流量 3GB。对于纯文本笔记同步来说完全够用。

### Q：应用密码忘记了怎么办

A：回到坚果云「第三方应用管理」页面，删除旧的应用密码，重新生成一个即可。

### Q：Fine-grained Token 过期了怎么办

A：回到 GitHub「Fine-grained tokens」页面，重新生成一个新 Token，然后在 App 中更新 Token 配置。

### Q：可以只启用一种同步方式吗

A：可以。只勾选你需要的方式即可。推送和拉取只会操作已勾选的目标。

### Q：推送时提示「本地存储空间不足」

A：手机浏览器 localStorage 空间有限（通常 5-10MB）。请删除部分不需要的笔记后重试。

### Q：安卓端 WebDAV 同步失败，提示 “Expected one of [OPTIONS, GET, HEAD, POST, PUT, DELETE, TRACE, PATCH] but was PROPFIND/MKCOL” 或 “云端同步目录不存在”

A：这是由于安卓底层的网络库（`HttpURLConnection`）的安全限制，不支持 WebDAV 的 `PROPFIND`（查询目录）和 `MKCOL`（创建目录）方法。
**解决办法**：请登录坚果云网页端或客户端，在根目录下**手动创建**您在 WebDAV 地址中填写的文件夹（如 `CCSyncNotes`）。手动创建文件夹后，安卓端使用标准的 `PUT` 和 `GET` 方法同步即可正常工作。

