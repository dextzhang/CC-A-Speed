# CC 安卓小工具界面设计规范

这份文档记录这次 `CC A Speed` 小工具使用的界面风格，方便以后继续用同一种视觉语言开发安卓小应用。

## 1. 风格名称

可以把这套风格叫作：

```text
CC Light Utility UI
```

中文可以叫：

```text
CC 轻量工具界面风格
```

它不是某个官方设计规范，而是一套适合个人工具、小型安卓 App、WebView 小应用的实用型界面风格。

关键词：

- 清爽
- 克制
- 工具感
- 移动端优先
- 信息明确
- 少装饰
- 轻卡片
- 柔和阴影
- 功能色点缀

## 2. 适合的应用类型

适合：

- 网络测速
- 待办清单
- 记账工具
- 倒计时
- 汇率换算
- AI 小工具
- OCR/翻译工具
- 查询类工具
- 个人仪表盘
- 本地数据记录工具

不太适合：

- 重营销官网
- 游戏主界面
- 强品牌视觉页面
- 高级内容社区
- 图片瀑布流产品

## 3. 总体设计原则

### 3.1 第一屏就是工具本身

不要做大段介绍页，不要先放营销 Hero。

用户打开 App 后，应直接看到核心功能。

例如测速 App：

```text
标题
状态
速度数字
延迟/上传/网络指标
开始按钮
历史记录
```

### 3.2 以任务为中心

界面不解释太多，不用很多说明文字。

按钮、状态、结果要让用户自然知道下一步做什么。

### 3.3 视觉安静，但不能单调

背景干净，主体留白充足。

通过一个主色和少量辅助色建立识别感。

不要整页都用同一种蓝色、紫色或灰色。

### 3.4 卡片少而清楚

可以使用卡片，但只用于承载明确的功能块：

- 主测速面板
- 设置面板
- 历史记录
- 单个指标

不要卡片套卡片，也不要让整个页面都堆满装饰卡片。

## 4. 页面结构

推荐结构：

```text
App Shell
├─ Topbar 顶部区域
│  ├─ 小标签
│  ├─ App 名称
│  └─ 设置按钮
├─ Main Panel 主功能面板
│  ├─ 状态
│  ├─ 核心数据
│  ├─ 次级指标
│  └─ 主操作按钮
├─ Optional Settings 设置面板
└─ History/List 历史或记录区域
```

移动端推荐宽度：

```css
width: min(100%, 520px);
margin: 0 auto;
```

这样在手机上满宽，在桌面预览时不会过宽。

## 5. 颜色规范

这套风格使用浅色背景、深色文字、青绿色主色、少量暖色提示。

推荐变量：

```css
:root {
  --bg: #f4f7fb;
  --surface: #ffffff;
  --surface-strong: #eef4fb;
  --ink: #152033;
  --muted: #667085;
  --line: #d7e0ea;
  --accent: #0f8b8d;
  --accent-strong: #0b6f71;
  --warm: #f59e0b;
  --danger: #c2410c;
}
```

颜色用途：

- `--bg`：页面背景
- `--surface`：主面板背景
- `--surface-strong`：指标卡、列表项背景
- `--ink`：主要文字
- `--muted`：说明文字、次级文字
- `--line`：边框
- `--accent`：主按钮、运行状态
- `--accent-strong`：小标签、强调文字
- `--warm`：等待、准备状态
- `--danger`：错误、失败状态

## 6. 背景

背景不要太花。

推荐：

```css
body {
  background:
    linear-gradient(180deg, rgba(15, 139, 141, 0.08), transparent 38%),
    var(--bg);
}
```

特点：

- 顶部有一点很轻的主色氛围
- 下方保持干净
- 不使用大面积渐变
- 不使用装饰光球、模糊色块、复杂背景图

## 7. 字体

使用系统字体即可：

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

中文环境下，系统会自动 fallback 到合适的中文字体。

文字原则：

- 标题大，但不要夸张
- 工具面板内的小标题要紧凑
- 数字结果可以非常大
- 不使用负字距
- 不使用跟随视口宽度无限缩放的文字

## 8. 标题区

顶部区域推荐：

```text
小标签
大标题
右侧图标按钮
```

小标签样式：

```css
.eyebrow {
  color: var(--accent-strong);
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
}
```

标题样式：

```css
h1 {
  font-size: clamp(2rem, 11vw, 3.3rem);
  line-height: 0.95;
}
```

注意：

- H1 可以是 App 名称
- 不要把功能说明写成大段标题
- 顶部按钮用图标，不用大文字按钮

## 9. 主功能面板

主面板是页面视觉中心。

推荐：

```css
.meter-panel {
  padding: 22px;
  border: 1px solid rgba(215, 224, 234, 0.92);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 18px 42px rgba(23, 35, 54, 0.12);
}
```

规范：

- 圆角控制在 `8px`
- 阴影柔和，不要重
- 边框要轻
- 面板内留白充足

## 10. 状态行

状态行用于告诉用户当前 App 正在做什么。

结构：

```text
小圆点 + 状态文字
```

状态点颜色：

- 准备/等待：暖黄色
- 运行中：主色
- 错误：橙红色

运行中可以加轻微外发光：

```css
.status-dot.running {
  background: var(--accent);
  box-shadow: 0 0 0 6px rgba(15, 139, 141, 0.13);
}
```

## 11. 核心数据展示

工具类 App 的核心结果应该非常醒目。

例如测速 App 的下载速度：

```css
.speed-number {
  font-size: clamp(4.4rem, 22vw, 7.5rem);
  font-weight: 800;
  line-height: 0.9;
  font-variant-numeric: tabular-nums;
}
```

原则：

- 数字可以大
- 单位要小一点
- 使用 `tabular-nums` 保持数字跳动时稳定
- 给结果区域固定或最小高度，避免界面跳动

## 12. 指标卡

次级指标使用小卡片：

```text
延迟
上传
网络
```

推荐：

```css
.metric-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.metric-card {
  min-height: 82px;
  padding: 12px 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface-strong);
}
```

移动端窄屏可以变成一列：

```css
@media (max-width: 380px) {
  .metric-grid {
    grid-template-columns: 1fr;
  }
}
```

## 13. 主按钮

主操作按钮用于页面最重要的动作。

例如：

- 开始测速
- 保存记录
- 开始识别
- 执行转换

推荐：

```css
.primary-action {
  width: 100%;
  min-height: 54px;
  border-radius: 8px;
  color: white;
  background: var(--accent);
  font-weight: 800;
  box-shadow: 0 14px 28px rgba(15, 139, 141, 0.22);
}
```

按钮内部可以使用：

```text
图标 + 文字
```

例如：

```text
▶ 开始测速
```

如果使用图标库，优先使用 lucide 图标。

## 14. 设置面板

设置不要一开始占据主要空间。

推荐通过右上角按钮展开。

设置面板样式：

```css
.settings-panel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
  padding: 14px;
}
```

适合放：

- 选项
- 模式
- 数值
- 开关
- 测试大小

不要放长篇说明。

## 15. 历史记录

历史记录适合放在主功能面板下方。

列表项推荐：

```css
.history-item {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  min-height: 56px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--surface-strong);
}
```

一条记录包含：

```text
时间 / 简要信息 / 核心结果
```

例如：

```text
05/25 00:15
延迟 42 ms · 上传 11.5 Mbps
86.2 Mbps
```

## 16. 圆角规范

统一使用小圆角：

```text
8px
```

适合：

- 面板
- 按钮
- 输入框
- 指标卡
- 列表项

不要使用很大的圆角胶囊，除非是状态标签或特殊控件。

## 17. 阴影规范

主面板可以有阴影：

```css
box-shadow: 0 18px 42px rgba(23, 35, 54, 0.12);
```

主按钮可以有轻微主色阴影：

```css
box-shadow: 0 14px 28px rgba(15, 139, 141, 0.22);
```

普通列表和设置面板尽量少用阴影。

原则：

- 阴影是层级提示，不是装饰
- 不要每个小元素都加阴影
- 不要使用过黑过重的阴影

## 18. 响应式规则

移动端优先。

推荐：

```css
.app-shell {
  width: min(100%, 520px);
  min-height: 100vh;
  margin: 0 auto;
  padding: max(18px, env(safe-area-inset-top)) 18px 28px;
}
```

窄屏处理：

```css
@media (max-width: 380px) {
  .app-shell {
    padding-inline: 12px;
  }

  .metric-grid,
  .settings-panel {
    grid-template-columns: 1fr;
  }
}
```

注意：

- 文字不能溢出按钮
- 数字不能撑破卡片
- 指标卡在窄屏可改为单列
- 给固定格式控件设置稳定尺寸

## 19. 文案规范

文案短、明确、有动作感。

推荐：

```text
开始测速
测速中
测速完成
网络不可用
最近记录
清空
```

避免：

```text
点击此按钮后将会开始进行网络速度测试
此处展示你的历史测速数据
你可以在这里配置测速参数
```

工具型 App 不需要过度解释。

## 20. 空状态

空状态要轻，不要占太大空间。

例如：

```text
暂无测速记录
```

推荐样式：

```css
.empty-state {
  display: grid;
  min-height: 52px;
  place-items: center;
  color: var(--muted);
  font-size: 0.92rem;
}
```

## 21. 交互状态

至少要有：

- 默认状态
- 运行中状态
- 错误状态
- 禁用状态
- 空状态

主按钮运行中：

```css
.primary-action:disabled {
  cursor: wait;
  opacity: 0.72;
}
```

运行中按钮文字可以从：

```text
开始测速
```

变成：

```text
测速中
```

## 22. 开发时的 CSS 模板

以后新工具可以从这个基础开始：

```css
:root {
  color-scheme: light;
  --bg: #f4f7fb;
  --surface: #ffffff;
  --surface-strong: #eef4fb;
  --ink: #152033;
  --muted: #667085;
  --line: #d7e0ea;
  --accent: #0f8b8d;
  --accent-strong: #0b6f71;
  --warm: #f59e0b;
  --danger: #c2410c;
  --shadow: 0 18px 42px rgba(23, 35, 54, 0.12);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  min-height: 100vh;
  margin: 0;
  color: var(--ink);
  background:
    linear-gradient(180deg, rgba(15, 139, 141, 0.08), transparent 38%),
    var(--bg);
}

.app-shell {
  width: min(100%, 520px);
  min-height: 100vh;
  margin: 0 auto;
  padding: max(18px, env(safe-area-inset-top)) 18px 28px;
}
```

## 23. 生成新界面时的提示词

以后让 AI 生成同风格小工具界面时，可以这样说：

```text
请使用 CC Light Utility UI 风格设计一个移动端安卓小工具界面。
要求：浅色背景、青绿色主色、8px 圆角、轻阴影、移动端优先、第一屏直接展示核心工具功能。
页面结构包含顶部标题区、主功能面板、主要操作按钮、次级指标或设置区、历史/结果列表。
不要做营销首页，不要使用大面积渐变、装饰光球、卡片套卡片。
使用纯 HTML/CSS/JavaScript 实现，适合 Capacitor 打包成安卓 App。
```

如果是具体工具，可以补充：

```text
工具类型：记账/倒计时/OCR/翻译/清单/查询器
核心操作：保存/开始/识别/转换/查询
核心结果：金额/时间/文本/状态/列表
```

## 24. 和 Material Design 的关系

这套风格不是完整 Material Design。

它借鉴了移动端工具 App 的一些通用原则：

- 层级清晰
- 触控目标足够大
- 状态明确
- 表单和按钮可预测

但它比 Material Design 更轻：

- 更少组件规范
- 更少动画
- 更少系统级复杂交互
- 更适合个人小工具快速开发

## 25. 一句话总结

`CC Light Utility UI` 是一套适合个人安卓小工具的轻量界面风格：

```text
浅色干净背景 + 青绿色功能主色 + 大核心数据 + 少量卡片 + 清晰按钮 + 移动端优先
```

它的目标不是炫技，而是让小工具打开就能用、看起来舒服、后续容易复用。
