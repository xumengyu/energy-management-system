# EcoWatt EMS 前端设计规范

本文档从当前代码库实现中归纳界面与交互约定，供新页面、新组件与评审对齐使用。权威实现以 [`index.css`](../index.css)、[`App.tsx`](../App.tsx) 及各业务组件为准。

---

## 1. 设计原则

| 原则 | 说明 |
|------|------|
| **双主题一致** | 所有界面元素需同时给出 `light` 与 `dark:` 变体；默认以深色为基座（见 [`index.html`](../index.html) 内联脚本）。 |
| **语义色 + 品牌色** | 主操作、导航高亮、关键正向反馈使用 **brand** 色阶；中性层次使用 **slate**；面板层次使用 **apple-*** 语义色。 |
| **少即是多** | 卡片化信息分区、细边框、轻阴影；避免强对比装饰抢占数据阅读。 |
| **工程可维护** | 优先复用 Tailwind 工具类与既有组件类（如 `ems-card`）；图标统一 **Lucide React**。 |

---

## 2. 技术栈与基础

| 层级 | 选型 |
|------|------|
| 框架 | React 18 + TypeScript |
| 构建 | Vite 6；开发端口 **3000**（[`vite.config.ts`](../vite.config.ts)） |
| 样式 | **Tailwind CSS v4** + `@tailwindcss/vite`；设计令牌在 [`index.css`](../index.css) 的 `@theme` 中扩展 |
| 深色模式 | `class` 策略：`html` 根节点挂 `.dark`（[`@custom-variant dark`](../index.css)） |
| 图标 | `lucide-react` |
| 图表 | `recharts`（数据可视化页） |
| 文案 | [`translations.ts`](../translations.ts)；语言类型 `en` \| `zh` \| `fr`（法语当前映射英文对象） |

---

## 3. 色彩系统

### 3.1 品牌色（Brand）

橄榄绿系主色，用于主按钮、侧栏激活态、链接强调、开关开启态等。

在 [`index.css`](../index.css) 的 `@theme` 中定义 `--color-brand-50` … `--color-brand-950`。组件中典型用法：

- **主按钮**：`bg-brand-600` `hover:bg-brand-700` `text-white` `shadow-md shadow-brand-500/20`
- **选中/弱强调背景**：`bg-brand-50` `dark:bg-brand-900/20` `text-brand-700` `dark:text-brand-400`
- **描边与聚焦环**：`border-brand-*`；输入聚焦 `focus:ring-brand-100` `dark:focus:ring-brand-900/30`

### 3.2 语义面板色（Apple 命名空间）

用于画布、浮起表面、次级表面与边框，形成层次：

| Token | 用途 |
|-------|------|
| `apple-bg-light` / `apple-bg-dark` | 页面底色（[`body`](../index.html)） |
| `apple-surface-light` / `apple-surface-dark` | 侧栏、顶栏、主卡片表面 |
| `apple-surface-secondary-light` / `apple-surface-secondary-dark` | 输入框、表格头底、嵌套块 |
| `apple-border-light` / `apple-border-dark` | 默认分隔线与卡片边框（低对比） |

### 3.3 中性色（Slate）

正文与次要文字：`text-slate-800` `dark:text-slate-100`、辅助 `text-slate-500` `dark:text-slate-400` 等；与 `apple-*` 搭配构成浅色模式下的边界与背景。

### 3.4 功能语义色（Tailwind 默认调色板）

在策略、状态、电价等模块中按语义使用（保持同一语义全站一致）：

| 语义 | 典型场景 | 类名方向 |
|------|----------|----------|
| 成功 / 正常 | 正常状态、充电相关 | `emerald-*` |
| 信息 / 二次操作 | 监控、蓝色 Tab | `blue-*` |
| 警告 | 告警、未完成 | `amber-*` / `yellow-*`（按页） |
| 危险 / 删除 | 删除确认、严重告警 | `rose-*` |
| 辅助导航 / 支路入口 | 列表次要操作 | `violet-*` |

---

## 4. 字体与排版

在 `@theme` 中声明：

- **无衬线正文**：`Inter`, system-ui, sans-serif（`--font-sans`）
- **等宽数据**：`JetBrains Mono`, `Fira Code`, monospace（`--font-mono`）— 用于 ID、功率数值、代码式字段

全局在 [`index.html`](../index.html) 中开启：

- `font-feature-settings` 与抗锯齿，提升数字与西文可读性。

**字重习惯**：页面标题常用 `font-black` / `font-bold`；表格头 `font-bold uppercase tracking-wider text-xs`；辅助说明 `text-xs` / `text-sm`。

---

## 5. 圆角、阴影与间距

| 元素 | 约定 |
|------|------|
| 主卡片 / 大面板 | `rounded-2xl`（`ems-card`）或 `rounded-3xl`（部分策略主区） |
| 按钮、输入、小节 | `rounded-xl`；小标签 `rounded-lg` / `rounded-full` |
| 阴影 | 卡片 `shadow-sm`；主按钮 `shadow-md` / `shadow-lg` + `shadow-brand-500/20` |
| 页面内边距 | `ems-page-shell` 使用 `p-4`；卡片内常见 `p-4` ~ `p-8` |
| 栅格 | `flex` / `grid` + `gap-*`；响应式前缀 `sm:` `md:` `lg:` `xl:` |

---

## 6. 布局组件类（全局）

定义于 [`index.css`](../index.css) `@layer components`：

| 类名 | 作用 |
|------|------|
| `ems-page-shell` | 页面内容区统一内边距 + 进入时 **0.3s** 透明度动画 |
| `ems-card` | 白底 / 深色表面 + `rounded-2xl` + 边框 + `shadow-sm` |
| `ems-segmented` | 分段控制器容器：浅灰底、圆角、内嵌 `p-1` |

**典型页面结构**：`ems-page-shell` → 顶部工具条 `ems-card` → 主内容 `ems-card`（或表格 `overflow-hidden`）。

**壳层布局**（[`App.tsx`](../App.tsx)）：固定侧栏宽度 `w-64` / 折叠 `w-14`，主区 `min-h-screen` + 顶栏高度约 **72px**（`h-[72px]`），与侧栏 `ml-*` 联动。

---

## 7. 交互组件模式

### 7.1 按钮

- **主要**：`bg-brand-600`、白字、圆角 `rounded-xl`、`font-bold text-sm`
- **次要**：白底 / 深色表面 + `border-slate-200` `dark:border-apple-border-dark` + 悬停 `hover:bg-slate-50` `dark:hover:bg-apple-bg-dark`
- **危险**：`bg-rose-600` / `text-rose-600` 边框样式等，与品牌按钮并列时使用 `rose` 系

按钮内图标与文字：`inline-flex items-center gap-2`，图标尺寸常见 **14–20px**。

### 7.2 表单控件

- **输入 / 选择**：`bg-slate-50` `dark:bg-apple-surface-secondary-dark`、`border-slate-200` `dark:border-apple-border-dark`、`rounded-xl`、`px-3 py-2` ~ `py-2.5`
- **聚焦**：`outline-none` + `focus:ring-2` + `focus:ring-brand-100`（深色 `dark:focus:ring-brand-900/30` 或模块内 `blue` / `emerald` 与语义一致）

### 7.3 表格

- 表头：`text-xs`、`uppercase`、`tracking-wider`、`bg-slate-50/50` `dark:bg-apple-surface-secondary-dark/50`
- 行悬停：浅灰底或 `dark:hover:bg-*` 微变

### 7.4 模态对话框

- 遮罩：`fixed inset-0` + `bg-slate-900/45` `dark:bg-black/55` + `backdrop-blur-[2px]`
- 内容：`rounded-2xl`、`z-index` 分层（如 `z-[101]`），`Escape` 关闭由页面自行监听（参考支路配置等）

### 7.5 滚动条

WebKit 自定义细滚动条，浅色用半透明黑、深色用半透明白（[`index.css`](../index.css) 底部）。

---

## 8. 动效与过渡

- 主题切换：[`body`](../index.html) `transition-colors duration-300`
- 侧栏宽度：`transition-all duration-300` + `cubic-bezier(0.25,0.1,0.25,1.0)`
- 页面进入：`ems-page-shell` 的 `ems-page-enter` 淡入
- 微交互：主按钮可 `hover:-translate-y-0.5`（策略页等）；加载 `animate-spin`

---

## 9. 国际化与内容

- 所有用户可见字符串应走 **`translations[lang]`**，避免组件内硬编码中英文（少量调试文案除外）。
- 新增键时：**英文 `en` 与中文 `zh` 同步添加**；`fr` 若未单独维护则继承 `en` 对象（见 [`translations.ts`](../translations.ts) 导出结构）。

---

## 10. 可访问性建议

- 图标按钮提供 `title` 或 `aria-label`（已有页面多为 `title`）。
- 对话框使用 `role="dialog"` / `alertdialog`、`aria-modal`、`aria-labelledby` 与描述区。
- 语义化 HTML：`button type="button"` 防止表单误提交；表单控件与 `label` 关联。

---

## 11. 新页面自检清单

1. 是否包裹 `ems-page-shell`，主块是否使用 `ems-card`？
2. 是否成对书写 `light` / `dark:` 颜色与边框？
3. 主操作是否使用 **brand** 色阶而非随意绿色？
4. 输入聚焦环是否与当前模块语义色一致？
5. 文案是否进入 `translations.ts`？
6. 图标是否来自 **Lucide**，尺寸与邻近文字是否协调？

---

## 12. 参考文件索引

| 主题 | 文件 |
|------|------|
| 设计令牌与全局组件类 | [`index.css`](../index.css) |
| 根节点主题与 body 类 | [`index.html`](../index.html) |
| 壳层 + 顶栏 + 侧栏联动 | [`App.tsx`](../App.tsx)、[`components/Sidebar.tsx`](../components/Sidebar.tsx) |
| 列表 + 工具条版式参考 | [`components/StationList.tsx`](../components/StationList.tsx)、[`components/PriceList.tsx`](../components/PriceList.tsx) |
| 复杂表单与分段控件 | [`components/ProtectionStrategy.tsx`](../components/ProtectionStrategy.tsx) |

---

*文档版本：1.0 · 与仓库实现同步归纳，后续若引入设计 Token 文件或 Storybook，可在此补充链接。*
