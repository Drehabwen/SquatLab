# AI Development SOP: SquatLab V1.0

## 1. Purpose

本 SOP 用于当前项目的 AI 协作开发。适用前提是：

- 你不依赖自己理解底层代码原理
- 大部分代码由 AI 生成
- 你仍然希望项目边界、质量和软著定位可控

目标不是让 AI 一次性生成整套系统，而是让每一轮开发都可控、可审、可回退。

## 2. Core Principle

项目采用以下基本原则：

- 先定边界，再写代码
- 一次只做一个小功能
- 每一轮都必须可审查
- 文档优先于实现
- 命名和接口优先于堆代码
- 先可运行闭环，再扩展功能

一句话总结：

- 你负责边界、验收和拍板
- AI 负责阅读、实现、解释和收口

## 3. Source Of Truth

每一轮开发前，AI 必须先读取以下文件：

- `docs/PRD.md`
- `docs/SPEC.md`
- `docs/CONSTRAINTS.md`
- `docs/ARCHITECTURE.md`
- `frontend/src/shared/config/design-tokens.json`
- `D:\Users\DORAT\Desktop\03_AI康复项目\codex-plan.md`

冲突处理顺序：

1. `PRD.md`
2. `SPEC.md`
3. `CONSTRAINTS.md`
4. `ARCHITECTURE.md`
5. 当前代码

如果代码和文档冲突，以文档为准。
如果文档之间冲突，先停下来修文档，不继续实现。

## 4. Role Division

### 4.1 User Responsibilities

- 决定产品边界
- 决定本轮只做什么
- 审核页面和功能是否符合预期
- 审核命名、范围、文档口径是否漂移
- 决定下一轮优先级

### 4.2 AI Responsibilities

- 先读文档和现有代码
- 只做当前轮次要求的功能
- 编辑前说明要改哪些文件
- 完成后说明改了什么和怎么验收
- 如果发现范围冲突，先停下来报告

## 5. Standard Round Workflow

每一轮开发严格按这个顺序走：

### Step 1: Define One Goal

本轮只能有一个目标，例如：

- 把首页做成可截图版本
- 实现深蹲状态机
- 接入摄像头采集
- 修复历史记录接口错误

禁止把多个大目标合并成一轮。

### Step 2: Read Context

AI 先读取：

- source-of-truth 文档
- 当前相关代码
- 当前计划文件

不能跳过阅读直接生成。

### Step 3: Announce Scope Before Editing

AI 在动文件之前，必须先告诉你：

- 这轮准备改哪些文件
- 为什么改这些文件
- 不会改哪些部分
- 验收口径是什么

### Step 4: Implement Minimally

实现时只做当前目标所需的最小闭环，不顺手扩展。

例如：

- 做页面时，不顺手改后端规则
- 做规则时，不顺手重构 UI
- 修 bug 时，不顺手加新功能

### Step 5: Self-Check

AI 完成后要说明：

- 改了哪些文件
- 每个文件的作用
- 哪些是正式实现
- 哪些还是占位
- 还有哪些风险

### Step 6: User Review

你只需要审以下问题：

1. 这轮是不是只做了一个功能
2. 有没有超出 PRD / SPEC / CONSTRAINTS
3. 改了哪些关键文件
4. 我应该怎么验收
5. 哪些部分还只是占位
6. 下一轮最合理的唯一目标是什么

## 6. Hard Rules

以下规则默认始终有效：

- 不得把项目扩展回综合康复平台
- 不得使用医疗诊断措辞
- 不得直接复用权属不清代码
- 不得在未更新 `SPEC.md` 的情况下随意改接口字段
- 不得脱离 `design-tokens.json` 自创品牌视觉
- 不得为了代码量硬堆无关功能
- 不得一次生成大量未经审查的整包代码

## 7. Task Types And Allowed Scope

### 7.1 Documentation Round

适用场景：

- 修 PRD
- 补 SPEC
- 改约束
- 收紧页面或接口边界

要求：

- 本轮不推进实现
- 先把边界说清楚

### 7.2 UI Round

适用场景：

- 页面结构
- token 落地
- 结果卡片
- 历史列表

要求：

- 强制读取 `design-tokens.json`
- 只做前端
- 不顺手扩展后端接口

### 7.3 Logic Round

适用场景：

- 深蹲状态机
- 评分逻辑
- 代偿检测规则

要求：

- 先说明输入和输出
- 先说明状态流转或阈值判断
- 若字段变化，先改文档

### 7.4 Integration Round

适用场景：

- 前后端联调
- 接口接入
- 历史记录读写

要求：

- 不同时做大范围 UI 重写
- 不同时做大范围规则重构

### 7.5 Bugfix Round

适用场景：

- 明确的报错
- 界面失真
- 接口不通
- 数据不一致

要求：

- 先定位根因
- 只修当前问题
- 修完给复现和验证方式

## 8. Prompt Templates

以下模板可直接复制给 AI。

### 8.1 Master Control Template

```text
你现在在这个项目里工作：

D:\Users\DORAT\Desktop\03_AI康复项目\SquatLab

先阅读这些文件，把它们作为唯一边界来源：
- docs/PRD.md
- docs/SPEC.md
- docs/CONSTRAINTS.md
- docs/ARCHITECTURE.md
- frontend/src/shared/config/design-tokens.json
- D:\Users\DORAT\Desktop\03_AI康复项目\codex-plan.md

工作规则：
- 先理解现有代码，再动手
- 一次只做一个功能
- 不要顺手扩展范围
- 先告诉我你准备改哪些文件、为什么改
- 改完后告诉我：改了什么、还没做什么、我怎么验收
- 如果发现当前需求和 PRD / SPEC / CONSTRAINTS 冲突，先停下来告诉我
- 不要改产品定位，不要引入医疗诊断措辞
- UI 必须服从 design-tokens.json，不要自创品牌色
```

### 8.2 Single-Round Delivery Template

```text
这轮只做一个功能：

【功能名称】

要求：
- 先读现有实现
- 只做这一个功能，不做别的
- 先告诉我会改哪些文件
- 然后直接实现
- 实现后告诉我：
  1. 改了哪些文件
  2. 每个文件改了什么
  3. 怎么运行或怎么查看
  4. 我应该重点验收什么
  5. 有哪些风险或暂时留空的地方

限制：
- 不要扩大产品范围
- 不要改接口命名，除非先更新 SPEC
- 不要新增与软著无关的复杂能力
- 不要为了代码量硬堆功能
```

### 8.3 UI Round Template

```text
这轮只做页面，不做算法，不做后端扩展。

目标：
把【页面名】做到可截图、可审查、风格统一。

强约束：
- 必须读取 frontend/src/shared/config/design-tokens.json
- 所有颜色、字号、间距、圆角、阴影优先从 token 映射
- 不要做成通用 SaaS 后台
- 不要用紫色主视觉
- 页面重点必须围绕“深蹲评估”

输出要求：
- 先告诉我准备改哪些前端文件
- 再实现
- 最后告诉我：
  1. 页面结构
  2. token 是怎么映射的
  3. 哪些地方还只是占位
  4. 我怎么看这个页面是否合格
```

### 8.4 Logic Round Template

```text
这轮只做规则逻辑，不做页面大改。

目标：
实现【例如：深蹲状态机 / 评分规则 / 代偿检测规则】

要求：
- 先读 backend 和相关前端代码
- 明确输入、输出、阈值、状态流转
- 只在当前功能范围内修改
- 不要引入平台级抽象
- 如果需要新增字段，先检查 docs/SPEC.md 是否允许；不允许就先告诉我

实现后必须告诉我：
1. 输入是什么
2. 输出是什么
3. 规则怎么判断
4. 改了哪些文件
5. 如何用样例验证
6. 哪些地方还是占位逻辑
```

### 8.5 Bugfix Template

```text
现在修这个问题，不做别的功能。

问题现象：
【把你看到的现象写上】

要求：
- 先定位根因
- 不要大改无关代码
- 先告诉我问题最可能出在哪几个文件
- 然后修复
- 修完告诉我：
  1. 根因是什么
  2. 改了哪些文件
  3. 为什么这样改
  4. 我怎么复现“已修复”
  5. 是否还有残留风险
```

### 8.6 Documentation Template

```text
先不要写实现，先只更新文档。

目标：
把【PRD / SPEC / CONSTRAINTS / ARCHITECTURE】补齐或修正，避免后续跑偏。

要求：
- 先读取现有文档
- 保持产品是“AI深蹲动作评估与训练反馈系统 V1.0”
- 保持单点产品定位
- 保持 design token 约束
- 保持非医疗诊断措辞

输出：
- 改了哪些文档
- 每份文档新增了什么约束
- 哪些点需要我拍板
```

## 9. Acceptance Checklist

每轮结束后，你只需要问：

1. 这轮是不是只做了我要求的一个功能
2. 有没有改出 `PRD.md` / `SPEC.md` / `CONSTRAINTS.md` 之外
3. 改了哪些文件，核心变化在哪里
4. 现在我应该怎么验收
5. 哪些部分还只是占位，不算真正完成
6. 下一轮最合理的唯一目标是什么

## 10. Recommended Build Order For SquatLab

当前项目建议按以下顺序推进：

1. 文档定边界
2. token 样式系统落地
3. 页面做到可截图
4. 摄像头接入
5. 深蹲状态机
6. 评分规则
7. 历史记录
8. 报告预览
9. 软著材料整理

## 11. Stop Conditions

以下情况出现时，AI 应停止继续扩展并先报告：

- 当前需求与 `PRD.md` 冲突
- 当前需求与 `SPEC.md` 字段定义冲突
- 当前实现会触发权属风险
- 当前设计方向偏离 token 体系
- 当前需求开始把产品推回康复平台
- 当前轮次已经不是“一个功能”

## 12. Definition Of Done

一轮任务只有在满足以下条件时，才算完成：

- 本轮目标单一且明确
- 改动范围受控
- 结果可查看或可验证
- 输出说明清楚
- 下一轮边界清楚

不满足以上条件时，宁可停在“可审查的半步”，也不要继续失控扩写。
