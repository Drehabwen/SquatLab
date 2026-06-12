# SPEC: AI深蹲动作评估与训练反馈系统 V1.0

## 1. Scope

本规格文档约束 `SquatLab` 的 V1.0 实现范围。它服务于三个目标：

- 给开发提供可执行边界，避免从“深蹲产品”漂移回“康复平台”
- 给设计提供 token 级别的落地依据，避免界面风格失控
- 给后续软著整理提供结构化依据，保证功能、代码、文档口径一致

V1.0 只做单一产品：`AI深蹲动作评估与训练反馈系统 V1.0`。

## 2. Product Form

产品形态采用单仓库前后端分离结构：

- `frontend/` 负责页面、采集流程、实时反馈展示、历史记录展示、参数设置
- `backend/` 负责评估结果入库、规则编排、报告摘要、历史查询、配置默认值

V1.0 默认是本地优先、单用户、单动作产品，不实现多角色后台，不实现机构级业务流。

## 3. Functional Modules

### 3.1 Session Capture

目标：完成一次深蹲采集与评估流程。

能力边界：

- 摄像头启停
- 入框引导
- 视角提示
- 开始前质控提示
- 采集中状态反馈
- 结束后结果摘要

### 3.2 Squat Analysis

目标：对一次或一组深蹲动作输出结构化结果。

V1.0 核心指标：

- `squat_count`
- `knee_sway_ratio`
- `knee_valgus_angle`
- `center_deviation_ratio`
- `left_right_symmetry`
- `linkage_smoothness`
- `squat_depth_ratio`

V1.0 输出结果：

- `overall_score`
- `front_score`
- `side_score`
- `findings`
- `summary`
- `suggestions`

### 3.3 History And Reports

目标：让一次评估结果可回看、可比较、可导出摘要。

V1.0 包含：

- 记录列表
- 单次详情
- 报告预览
- 摘要建议

V1.0 不包含：

- 多人档案管理
- 云端同步
- 医疗报告
- 机构工作台

### 3.4 Settings

目标：暴露少量必要配置，而不是做复杂管理后台。

V1.0 配置项上限：

- 摄像头相关默认项
- API 地址
- 阈值调优开关
- 界面基础偏好

## 4. Screen Specification

### 4.1 Dashboard

职责：

- 展示产品定位
- 引导进入深蹲评估
- 展示最近一次评估摘要
- 提供历史和设置入口

禁止：

- 塞入多产品入口
- 塞入平台化导航
- 做成通用 SaaS 卡片首页

### 4.2 Squat Session Page

职责：

- 展示实时采集区域
- 展示动作阶段
- 展示实时反馈
- 展示实时计数与阶段评分
- 在结束后展示结果卡片

页面主层级：

- hero 级评估区
- 实时状态栏
- 问题与建议区
- 核心评分区

### 4.3 History Page

职责：

- 列出历史记录
- 支持按时间查看
- 支持打开单次报告摘要

### 4.4 Settings Page

职责：

- 展示运行环境配置
- 展示可调整阈值
- 展示数据和说明类设置

## 5. API Specification

### 5.1 Health

- `GET /health`
- `GET /ready`

### 5.2 Assessments

- `POST /api/v1/squat/assessments`

Request:

```json
{
  "squat_count": 12,
  "knee_sway_ratio": 0.08,
  "knee_valgus_angle": 9,
  "center_deviation_ratio": 0.06,
  "left_right_symmetry": 0.91,
  "linkage_smoothness": 0.82,
  "squat_depth_ratio": 0.78
}
```

Response:

```json
{
  "session_id": "uuid",
  "overall_score": 84,
  "front_score": 86,
  "side_score": 82,
  "findings": [
    "膝部内扣趋势明显"
  ],
  "suggestions": [
    "存在膝内扣趋势，注意膝盖方向与脚尖方向保持一致。"
  ]
}
```

### 5.3 Sessions

- `GET /api/v1/squat/sessions`

Response item:

```json
{
  "session_id": "uuid",
  "overall_score": 84,
  "squat_count": 12,
  "created_at": "2026-04-18T12:00:00Z"
}
```

### 5.4 Report Preview

- `POST /api/v1/squat/reports/preview`

Response:

```json
{
  "summary": "本次深蹲整体完成度较好，但存在轻度膝内扣和躯干前倾。",
  "key_findings": [
    "下蹲深度达标",
    "稳定性中等",
    "左右平衡基本正常"
  ],
  "risk_flags": [
    "mild_knee_valgus",
    "forward_trunk_lean"
  ],
  "training_suggestions": [
    "降低速度并保持膝盖与脚尖方向一致",
    "加强核心稳定控制"
  ]
}
```

## 6. Data Rules

规则层约束：

- 前后端 JSON 统一使用 `snake_case`
- 指标字段命名一旦公开，不允许随意漂移
- 页面文案可以调整，但接口字段在 V1.0 阶段尽量保持稳定
- 若新增指标，必须先更新 `PRD.md` 与本规格文档

## 7. Design Token Binding

设计以 `frontend/src/shared/config/design-tokens.json` 为唯一 token 来源。V1.0 页面不允许随意发明新品牌色。

### 7.1 Color Binding

- 页面大背景：`color-neutral-paper-50`
- 次级底色/弱分区：`color-neutral-paper-100`
- 主文本：`color-neutral-paper-900`
- 次级文本：`color-neutral-paper-600`
- 分割线/默认边框：`color-neutral-paper-200`
- 主品牌色：`color-brand-primary-teal-500`
- 主品牌深色文字：`color-brand-primary-teal-700`
- 主强调高对比场景：`color-brand-primary-teal-900`
- CTA/重点强调：`color-brand-accent-amber-500`
- 暖色强调深色文字：`color-brand-accent-amber-700`
- 图表与数据高亮：`color-data-blue-500`
- 错误/危险：`color-semantic-danger`
- 成功提示底：`color-semantic-success-bg`
- 警示提示底：`color-semantic-warning-bg`
- 错误提示底：`color-semantic-danger-bg`
- 信息提示底：`color-semantic-info-bg`
- 高对比面板底：`color-pure-white`

### 7.2 Typography Binding

- 主字体：`typography-font-family-primary`
- 等宽字体：`typography-font-family-monospace`
- 正文默认字号：`typography-font-size-base`
- 辅助文字：`typography-font-size-sm`
- 模块标题：`typography-font-size-xl`
- 页级标题：`typography-font-size-3xl` 或 `typography-font-size-4xl`
- 标题字重：`typography-font-weight-semibold` 或 `typography-font-weight-bold`
- 正文字重：`typography-font-weight-normal`
- 行高默认：`typography-line-height-normal`

### 7.3 Layout Binding

- 基础间距体系：`spacing-*`
- 圆角体系：`border-radius-*`
- 阴影体系：`shadows-*`
- 响应式断点：`breakpoints-*`
- 弹层层级：`z-index-*`

## 8. Interaction Constraints

- 不做暗黑模式优先设计
- 不做紫色主导品牌
- 不做通用数据中台视觉
- 页面第一视觉必须围绕“深蹲评估”而不是“后台管理”
- 关键结果必须在一次会话结束后立即可见

## 9. Change Control

以下变化不能直接进代码，必须先改文档：

- 产品名称变化
- 指标集合变化
- 页面主结构变化
- token 映射变化
- 平台边界变化
- 医疗表述变化

## 10. Document References

| Document | Location | Purpose |
|----------|----------|---------|
| API Specification | `docs/API.md` | 接口定义、请求/响应格式 |
| Technical Roadmap | `docs/TECH_ROADMAP.md` | 技术路径、里程碑 |
| Constraints | `docs/CONSTRAINTS.md` | 开发约束、边界限制 |
| PRD | `docs/PRD.md` | 产品需求文档 |

## 11. Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-04-18 | Initial specification |
| 1.0.1 | 2026-04-18 | Added document references section |
