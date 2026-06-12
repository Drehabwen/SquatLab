# SquatLab 设计规范文档

## 1. 概述

本文档定义了 SquatLab 项目的设计规范，包括：颜色系统、字体规范、间距与圆角、UI 组件设计、项目架构规范、代码风格规范等。

**设计语言**：Clinical Atelier（临床工作室）- 专业、清晰、温暖的医疗康复产品风格

---

## 2. 颜色系统

### 2.1 品牌主色（Teal 系列）

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--color-brand-primary-teal-50` | `#e0f2f0` | 最浅背景、hover 状态 |
| `--color-brand-primary-teal-100` | `#a5d9d5` | 次要背景 |
| `--color-brand-primary-teal-200` | `#5cb4ac` | 强调边框 |
| `--color-brand-primary-teal-500` | `#2d7d74` | 主按钮、图标 |
| `--color-brand-primary-teal-700` | `#1a5050` | 文字、深色按钮 |
| `--color-brand-primary-teal-900` | `#0a2b28` | 最深色、标题 |

### 2.2 品牌强调色（Amber 系列）

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--color-brand-accent-amber-50` | `#fef1e5` | 警告背景 |
| `--color-brand-accent-amber-100` | `#f8d4a3` | 次要强调 |
| `--color-brand-accent-amber-200` | `#e8a05a` | 导航激活状态 |
| `--color-brand-accent-amber-500` | `#c8762a` | 次要按钮、CTA |
| `--color-brand-accent-amber-700` | `#8c5018` | 强调文字 |
| `--color-brand-accent-amber-900` | `#4d2b09` | 最深强调色 |

### 2.3 中性色（Paper 系列）

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--color-neutral-paper-50` | `#f5f3ee` | 页面背景 |
| `--color-neutral-paper-100` | `#eae8e2` | 卡片背景 |
| `--color-neutral-paper-200` | `#d0cec7` | 边框 |
| `--color-neutral-paper-400` | `#9a9890` | 占位符文字 |
| `--color-neutral-paper-600` | `#6b6965` | 次要文字 |
| `--color-neutral-paper-800` | `#3a3835` | 主要文字 |
| `--color-neutral-paper-900` | `#1c1b18` | 标题、最深色 |

### 2.4 语义色

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--color-semantic-danger` | `#d84040` | 错误、危险操作 |
| `--color-semantic-success-bg` | `#e8f5f2` | 成功状态背景 |
| `--color-semantic-warning-bg` | `#fef5ec` | 警告状态背景 |
| `--color-semantic-danger-bg` | `#fdecec` | 错误状态背景 |
| `--color-semantic-info-bg` | `#eef4fb` | 信息状态背景 |

### 2.5 数据可视化色

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--color-data-blue-50` | `#e8f1f8` | 图表背景 |
| `--color-data-blue-500` | `#1a5fa8` | 图表主色 |

### 2.6 渐变定义

```css
/* 页面背景渐变 */
background:
  radial-gradient(circle at top left, rgb(45 125 116 / 0.2), transparent 25%),
  radial-gradient(circle at top right, rgb(200 118 42 / 0.15), transparent 22%),
  linear-gradient(180deg, var(--color-neutral-paper-50) 0%, #f9f6f0 100%);

/* Hero 面板渐变 */
background:
  radial-gradient(circle at top right, rgb(232 160 90 / 0.28), transparent 28%),
  linear-gradient(155deg, rgb(10 43 40), rgb(26 80 80 / 0.98) 55%, rgb(45 125 116 / 0.94));

/* 品牌图标渐变 */
background: linear-gradient(135deg, var(--color-brand-primary-teal-500), var(--color-brand-primary-teal-700));

/* 主按钮渐变 */
background: linear-gradient(135deg, var(--color-brand-primary-teal-500), var(--color-brand-primary-teal-700));
```

---

## 3. 字体系统

### 3.1 字体族

```css
--typography-font-family-primary: "Manrope", "Inter", "Roboto", sans-serif;
--typography-font-family-monospace: "Fira Code", "Courier New", monospace;
```

### 3.2 字号体系

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--typography-font-size-xs` | `0.75rem` (12px) | 标签、辅助文字 |
| `--typography-font-size-sm` | `0.875rem` (14px) | 次要文字、说明 |
| `--typography-font-size-base` | `1rem` (16px) | 正文 |
| `--typography-font-size-lg` | `1.125rem` (18px) | 小标题 |
| `--typography-font-size-xl` | `1.25rem` (20px) | 标题 |
| `--typography-font-size-2xl` | `1.5rem` (24px) | 大标题 |
| `--typography-font-size-3xl` | `1.875rem` (30px) | 页面标题 |
| `--typography-font-size-4xl` | `2.25rem` (36px) | Hero 标题 |
| `--typography-font-size-5xl` | `3rem` (48px) | 超大标题 |

### 3.3 字重规范

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--typography-font-weight-normal` | `400` | 正文 |
| `--typography-font-weight-medium` | `500` | 次要强调 |
| `--typography-font-weight-semibold` | `600` | 标签、按钮 |
| `--typography-font-weight-bold` | `700` | 标题、数值 |

### 3.4 行高设置

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--typography-line-height-tight` | `1.25` | 大标题 |
| `--typography-line-height-normal` | `1.5` | 正文 |
| `--typography-line-height-relaxed` | `1.75` | 说明文字 |

---

## 4. 间距与布局

### 4.1 间距规范

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--spacing-0` | `0` | 无间距 |
| `--spacing-1` | `0.25rem` (4px) | 极小间距 |
| `--spacing-2` | `0.5rem` (8px) | 紧凑间距 |
| `--spacing-3` | `0.75rem` (12px) | 小组件间距 |
| `--spacing-4` | `1rem` (16px) | 标准间距 |
| `--spacing-5` | `1.25rem` (20px) | 中等间距 |
| `--spacing-6` | `1.5rem` (24px) | 卡片内边距 |
| `--spacing-8` | `2rem` (32px) | 区块间距 |
| `--spacing-10` | `2.5rem` (40px) | 大间距 |
| `--spacing-12` | `3rem` (48px) | 页面间距 |

### 4.2 圆角规范

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--border-radius-sm` | `0.125rem` (2px) | 极小圆角 |
| `--border-radius-base` | `0.25rem` (4px) | 小圆角 |
| `--border-radius-md` | `0.375rem` (6px) | 中圆角 |
| `--border-radius-lg` | `0.5rem` (8px) | 标准圆角 |
| `--border-radius-xl` | `0.75rem` (12px) | 大圆角 |
| `--border-radius-2xl` | `1rem` (16px) | 卡片圆角 |
| `--border-radius-full` | `9999px` | 胶囊/圆形 |

### 4.3 阴影规范

| 变量名 | 用途 |
|--------|------|
| `--shadows-sm` | 卡片基础阴影 |
| `--shadows-base` | 按钮阴影 |
| `--shadows-md` | 悬浮卡片阴影 |
| `--shadows-lg` | 弹窗阴影 |
| `--shadows-xl` | Hero 面板阴影 |

### 4.4 布局容器

```css
--app-shell-max-width: 1280px;
--top-bar-height: 4.5rem;
--bottom-bar-height: 5.25rem;
```

---

## 5. UI 组件规范

### 5.1 Button 按钮

**变体**：
- `primary` - 主操作，Teal 渐变
- `secondary` - 次要操作，Amber 渐变
- `tertiary` - 第三操作，白底边框
- `ghost` - 幽灵按钮，透明背景

**尺寸**：
- `small` - `min-height: 2.5rem`
- `medium` - `min-height: 3rem`
- `large` - `min-height: 3.4rem`

**使用示例**：
```tsx
<Button variant="primary" size="medium" icon="analytics">
  开始评估
</Button>
```

### 5.2 SurfaceCard 卡片

**变体**：
- `lowest` - 白底，标准边框
- `low` - 浅灰底，标准边框
- `high` - Teal 渐变顶边，强调边框
- `container` - 深色背景，白色文字

**内边距**：
- `none` - 无内边距
- `small` - `var(--spacing-4)`
- `medium` - `var(--spacing-6)`
- `large` - `var(--spacing-8)`

**使用示例**：
```tsx
<SurfaceCard variant="lowest" padding="large">
  <h2>标题</h2>
  <p>内容</p>
</SurfaceCard>
```

### 5.3 Badge 徽章

**变体**：
- `primary` - Teal 背景
- `secondary` - Amber 背景
- `success` - 成功绿背景
- `warning` - 警告橙背景
- `error` - 错误红背景

### 5.4 StatCard 统计卡片

用于展示关键数值指标，支持图标、趋势指示。

**变体**：
- `default` - 标准样式
- `highlight` - Teal 高亮背景
- `accent` - Amber 强调背景

### 5.5 InsightCard 洞察卡片

用于展示建议、洞察信息，包含图标、标题、描述和可选操作按钮。

### 5.6 BottomNavBar 底部导航栏

- 固定定位在底部
- 毛玻璃效果背景
- 4 个导航项：首页、评估、记录、设置
- 激活状态使用 Amber 色

### 5.7 TopAppBar 顶部应用栏

- 粘性定位在顶部
- 毛玻璃效果背景
- 左侧：品牌图标 + 标题
- 右侧：设置按钮

---

## 6. 项目架构规范

### 6.1 目录结构

```
frontend/src/
├── features/              # 功能模块
│   ├── home/             # 首页功能
│   │   ├── pages/        # 页面组件
│   │   └── components/   # 功能组件
│   ├── squat/            # 深蹲评估功能
│   │   ├── pages/
│   │   └── components/
│   ├── history/          # 历史记录功能
│   │   ├── pages/
│   │   ├── components/
│   │   └── hooks/
│   └── settings/         # 设置功能
│       └── pages/
├── shared/               # 共享资源
│   ├── components/       # 共享组件
│   │   ├── ui/          # UI 基础组件
│   │   └── Icon.tsx     # 图标组件
│   ├── config/          # 配置文件
│   ├── api/             # API 客户端
│   ├── types/           # TypeScript 类型
│   ├── i18n/            # 国际化
│   └── layout/          # 布局组件
├── App.tsx              # 应用入口
└── main.tsx             # 渲染入口
```

### 6.2 命名规范

- **文件名**：PascalCase（组件）、camelCase（工具）
- **组件名**：PascalCase
- **变量/函数**：camelCase
- **常量**：UPPER_SNAKE_CASE
- **CSS 类名**：kebab-case

### 6.3 组件结构

```tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface ComponentProps {
  prop1: string;
  prop2?: number;
}

export function ComponentName({ prop1, prop2 = 0 }: ComponentProps) {
  const { t } = useTranslation();
  const [state, setState] = useState();

  return (
    <div className="component-class">
      {content}
    </div>
  );
}
```

---

## 7. 代码风格规范

### 7.1 TypeScript 类型

- 使用 `interface` 定义对象类型
- 使用 `type` 定义联合类型、交叉类型
- Props 接口命名：`ComponentNameProps`

### 7.2 导入顺序

1. React 相关
2. 第三方库
3. 共享组件
4. 本地组件
5. 类型定义
6. 工具函数

### 7.3 国际化

- 所有用户可见文字必须使用 `t()` 函数
- 翻译键命名：`namespace.keyName`
- 默认语言：中文 (zh-CN)
- 支持语言：中文、英文

### 7.4 响应式设计

- 移动优先
- 断点：720px（平板）、480px（手机）
- 使用 CSS 变量和 clamp() 函数

---

## 8. 响应式规范

### 8.1 断点

| 断点 | 宽度 | 用途 |
|------|------|------|
| 桌面 | > 720px | 完整布局 |
| 平板 | ≤ 720px | 单列布局 |
| 手机 | ≤ 480px | 紧凑布局 |

### 8.2 移动端适配

- 底部导航栏固定定位
- 触摸目标最小 44x44px
- 禁用 hover 效果，使用 active 状态
- 输入框字体 ≥ 16px 防止 iOS 缩放

---

## 9. 动画与交互

### 9.1 过渡效果

```css
transition: transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
```

### 9.2 悬浮效果

- 卡片：`translateY(-1px)`
- 按钮：`translateY(-1px)` + 阴影增强
- 图标按钮：`scale(0.95)` 点击反馈

### 9.3 触摸反馈

- 按钮点击：`scale(0.98)`
- 导航项点击：背景色变化
- 禁用触摸设备的 hover 效果

---

## 10. 无障碍规范

- 所有交互元素必须有 `aria-label`
- 图标使用 `aria-hidden="true"`
- 颜色对比度符合 WCAG AA 标准
- 键盘导航支持

---

## 11. 性能最佳实践

### 11.1 React 优化

- 使用 `useMemo` 缓存计算结果
- 使用 `useCallback` 缓存函数
- 避免不必要的重渲染

### 11.2 CSS 优化

- 使用 CSS 变量统一管理
- 避免过度使用 backdrop-filter
- 使用 transform 代替 position 动画

---

## 12. 附录

### A. 相关依赖

| 库 | 版本 | 用途 |
|----|------|------|
| React | 18+ | UI 框架 |
| React Router | 6+ | 路由管理 |
| react-i18next | 13+ | 国际化 |
| TypeScript | 5+ | 类型检查 |
| Vite | 5+ | 构建工具 |

### B. 设计原则

1. **Clinical Atelier** - 专业医疗产品风格，温暖而不失严谨
2. **组件复用** - 避免重复代码，使用共享组件
3. **设计 Token** - 所有样式值使用 CSS 变量
4. **移动优先** - 先设计移动端，再扩展到桌面
5. **强引导文案** - 直接、简洁、行动导向
