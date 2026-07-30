# SPEC: RehabScreenLab 青少年姿态与脊柱早筛系统 V2.0

## 1. 文档状态

本文是 V2.0 产品与工程实现的权威规格，定义两级筛查流程、页面职责、状态机、采集质控、算法边界、报告门槛和兼容策略。

当前代码已实现静态体态、Adams 前屈、深蹲和综合报告的基础结构；`gait_silhouette` 及两级任务状态属于 vNext 待实现能力。文档不得把待实现能力描述为已上线。

## 2. 系统边界

系统负责：

- 对象建档与筛查任务；
- 步态剪影一级分诊；
- 静态体态与 Adams 标准筛查；
- 可选深蹲动作证据；
- 自动质控、复采、复核、报告和复测；
- 结构化证据与下一步动作。

系统不负责：

- 医学诊断；
- Cobb 角估计；
- 自动治疗处方；
- 用剪影替代 X 光、3D 表面评估或专科检查；
- 在未经现场验证时输出确定性患病概率。

## 3. 产品模式

### 3.1 Rapid Triage

面向批量对象的一级初筛，只要求 `gait_silhouette`。

可生成：

- 初筛分诊结果；
- 采集质量结果；
- 下一步动作。

不可生成：

- 正式筛查报告；
- 诊断性结论。

### 3.2 Standard Screening

面向一级触发对象或专业人员指定对象。

必需证据：

- 可用的一级剪影结果或明确的升级原因；
- `static_posture`；
- 由受训人员完成的 `adams_forward_bend` 结构化观察记录；
- 人工复核状态。

可选证据：

- `squat`；
- 历史复测；
- 外部专业检查摘要。

### 3.3 Movement Follow-up

深蹲作为动作控制和训练反馈模块独立存在，可关联到筛查任务，但不作为正式脊柱筛查的默认必需协议。

## 4. 领域模型

### 4.1 Protocol Types

```ts
type ProtocolType =
  | "gait_silhouette"
  | "static_posture"
  | "adams_forward_bend"
  | "squat";

type ProtocolRole =
  | "initial_triage"
  | "standard_screening"
  | "optional_support";
```

映射：

| Protocol | Role | 是否默认必需 |
| --- | --- | --- |
| `gait_silhouette` | `initial_triage` | 一级必需 |
| `static_posture` | `standard_screening` | 二级必需 |
| `adams_forward_bend` | `standard_screening` | 二级必需 |
| `squat` | `optional_support` | 否 |

### 4.2 Workflow Status

API 使用 `snake_case`：

```ts
type ScreeningStatus =
  | "pending_initial_screening"
  | "initial_screening_in_progress"
  | "pending_standard_screening"
  | "pending_recapture"
  | "pending_review"
  | "pending_report"
  | "pending_retest"
  | "archived";
```

每个状态必须对应可见动作：

| Status | Primary action |
| --- | --- |
| `pending_initial_screening` | `start_initial_screening` |
| `initial_screening_in_progress` | `continue_capture` |
| `pending_standard_screening` | `start_standard_screening` |
| `pending_recapture` | `recapture` |
| `pending_review` | `send_to_review` |
| `pending_report` | `generate_formal_report` |
| `pending_retest` | `schedule_retest` |
| `archived` | `view_archive` |

### 4.3 Risk And Action

```ts
type RiskLevel =
  | "low"
  | "attention"
  | "review_required"
  | "recapture_needed";

type NextAction =
  | "pass_initial_triage"
  | "start_standard_screening"
  | "recapture"
  | "manual_review"
  | "professional_evaluation"
  | "generate_formal_report"
  | "schedule_retest"
  | "archive";
```

### 4.4 Data Completeness

```ts
type DataCompleteness = {
  required_protocols: ProtocolType[];
  completed_protocols: ProtocolType[];
  usable_protocols: ProtocolType[];
  missing_protocols: ProtocolType[];
  blocking_reasons: string[];
  formal_report_ready: boolean;
};
```

缺失协议不得被解释为正常。

## 5. 功能模块

### 5.1 Topic Overview

展示：

- 初筛进度；
- 待标准筛查人数；
- 待复采、待复核、待报告和待复测数量；
- 阻塞原因分布；
- 当日采集质量趋势。

不展示：

- AI 诊断人数；
- 未经审核的患病率结论。

### 5.2 Screening Tasks

队列首列必须是“下一步动作”，其次才是对象信息。

支持筛选：

- 状态；
- 风险等级；
- 采集质量；
- 阻塞原因；
- 负责人；
- 到期时间。

### 5.3 Student Processing Hub

对象详情承担处理中心职责：

- 基本信息；
- 当前状态和下一步动作；
- 协议进度；
- 采集质量；
- 专科证据；
- 历史复测；
- 报告条件；
- 操作记录。

### 5.4 Capture

通用采集页必须包含：

- 操作说明；
- 相机预览；
- 自动质量检查；
- 当前阻塞原因；
- 重新采集；
- 分析提交；
- 隐私与数据保存提示。

### 5.5 Reports And Archive

报告页必须先展示：

- `formal_report_ready`；
- 数据完整度；
- 未满足条件；
- 是否需要人工复核。

只有条件满足时才能执行 `generate_formal_report`。

### 5.6 Alerts And Retest

支持：

- 复采提醒；
- 待复核提醒；
- 复测到期；
- 多次结果变化；
- 未完成转介记录。

## 6. 步态剪影采集规格

### 6.1 Capture Protocol

目标：取得用于一级风险分诊的标准化短步行序列。

建议流程：

1. 受试者全身进入画面；
2. 系统确认距离、方向和镜像状态；
3. 受试者自然步行 5–8 秒；
4. 至少获得 30 个可用剪影帧和足够的步态覆盖；
5. 系统完成自动质控后才允许分析。

正式采集参数必须由本地验证确定；上述值是工程默认值，不是临床阈值。

### 6.2 Automatic Quality Gate

至少检查：

- `full_body_visible`；
- `valid_frame_ratio`；
- `mask_completeness`；
- `occlusion_ratio`；
- `subject_scale_ratio`；
- `camera_stability`；
- `view_consistency`；
- `mirror_state_known`；
- `motion_coverage`；
- `segmentation_confidence`。

任一关键项失败：

```text
protocol_status = needs_recapture
risk_level = recapture_needed
next_action = recapture
```

不得继续输出风险结论。

### 6.3 Feature Contract

V2.0 首选可解释轻量特征：

- 24 个水平身体分段；
- 每段左右轮廓位置的跨帧均值；
- 保留方向的中心偏移；
- 可选的跨帧稳定性；
- 关键点派生的肩、髋、踝方向性偏移用于解释和质控。

默认候选模型：

```text
48维左右轮廓均值
→ train-only normalization
→ regularized logistic regression
→ calibrated screening score
```

禁止：

- 仅使用最低分段两个特征作为正式模型；
- 将固定 8 特征写成医学规则；
- 将无方向绝对不对称作为唯一输入；
- 在前端硬编码论文系数；
- 将研究 AUC 作为产品现场性能。

### 6.4 Model Output

```ts
type SilhouetteModelOutput = {
  model_version: string;
  feature_schema_version: string;
  screening_score: number;
  confidence: "low" | "medium" | "high";
  uncertainty_reason?: string;
  out_of_distribution: boolean;
  directional_findings: Array<{
    region: "shoulder" | "thoracic" | "waist" | "hip" | "distal";
    direction: "left" | "right" | "unclear";
    magnitude: number;
  }>;
};
```

`screening_score` 仅用于分诊。面向普通用户不显示“患病概率”措辞。

## 7. 静态体态与 Adams 规格

### 7.1 Static Posture

职责：

- 验证剪影发现是否在静态站立中持续存在；
- 输出肩、躯干和骨盆的方向与幅度；
- 作为标准筛查证据，不独立诊断。

### 7.2 Adams Forward Bend

职责：

- 手机端提供前屈动作引导、动作完成记录和视频/图像证据留存；
- 由受训人员录入胸段和腰段背部不对称观察；
- 如使用脊柱侧弯测量仪，由人工录入设备测得的 ATR；
- 明显异常或置信度不足时进入人工复核。

限制：

- 2D 相机不得输出 Cobb 角；
- 手机端不得自动输出 Adams 严重度或 ATR；
- 不得把肩髋关键点高度差、轮廓差或模型分数表述为 ATR；
- ATR 必须来自经验证的测量设备，并记录测量来源和操作者；
- Adams 不能被步态剪影自动替代。

### 7.3 Squat

职责：

- 提供重心偏移、膝髋控制和动态稳定性证据；
- 支持康复和动作随访；
- 不参与一级剪影分诊；
- 不单独触发脊柱专业评估。

## 8. 状态转换规则

```text
pending_initial_screening
→ initial_screening_in_progress

initial_screening_in_progress
├─ quality fail → pending_recapture
├─ low risk + usable + confident → pending_retest or archived
├─ attention / uncertain → pending_standard_screening
└─ OOD / conflict → pending_review

pending_standard_screening
├─ required evidence missing → pending_recapture
├─ evidence conflict → pending_review
└─ evidence complete → pending_report

pending_report
├─ reviewer rejects evidence → pending_review / pending_recapture
└─ report approved → pending_retest or archived
```

## 9. Formal Report Conditions

```ts
type FormalReportConditions = {
  initial_triage_usable: boolean;
  static_posture_usable: boolean;
  adams_usable: boolean;
  mandatory_review_completed: boolean;
  unresolved_conflicts: string[];
  blocking_reasons: string[];
  ready: boolean;
};
```

`ready = true` 必须同时满足：

- 二级流程已被触发；
- 一级剪影结果可用，或已记录无法使用的原因和人工升级依据；
- 静态体态可用；
- Adams 可用；
- 所有强制人工复核已完成；
- 无未处理的证据冲突；
- 无必需协议处于 `needs_recapture`。

深蹲不是正式报告条件。

## 10. 页面规格

### 10.1 Overview

- 主指标：进度、阻塞、待处理动作；
- 不以平均分或“AI 诊断率”为首屏重点。

### 10.2 Task Queue

- 默认按风险与到期时间排序；
- 每行提供一个主要动作；
- 支持批量分配和批量提醒。

### 10.3 Capture Page

- 质量门槛实时可见；
- 按阻塞原因给出可执行修正；
- 质量合格前禁用分析；
- 不允许人工将 `poor` 强制改为 `good`。

### 10.4 Student Detail

- 显示协议时间线和下一步；
- 分开展示剪影、静态、Adams、深蹲证据；
- 显示方向、幅度、置信度和冲突；
- 提供复采、送审、生成报告、安排复测操作。

### 10.5 Report

顺序：

1. 报告条件；
2. 数据完整度与采集质量；
3. 风险等级和下一步动作；
4. 单协议证据；
5. 跨协议一致性与冲突；
6. 复测建议；
7. 免责声明。

## 11. 数据与隐私

- 原始 RGB 默认仅用于即时处理，不长期保存；
- 优先保存剪影掩码、结构化特征、质控结果和模型版本；
- 如需保存原始视频，必须具有明确授权、保留期限和访问控制；
- 导出数据应去标识化；
- 数据集许可与产品商业用途必须单独确认；
- 操作日志记录谁在何时完成采集、复核和报告。

## 12. 非功能要求

- 移动端本地推理优先；
- 低端设备上不得依赖持续云端 GPU；
- 模型与阈值可版本化和回滚；
- 分析失败必须可重试且不得产生半完成报告；
- 核心状态转换具备测试覆盖；
- 中文文案不得出现乱码；
- 前后端 JSON 使用 `snake_case`。

## 13. 兼容与迁移

- 现有 `static_posture`、`adams_forward_bend`、`squat` 结果继续有效；
- 现有深蹲快捷入口保留为 Movement Follow-up；
- 旧 `in_progress/completed` 状态读取时映射到新状态；
- 新增 `gait_silhouette` 时不得破坏旧会话；
- 历史三协议报告标记为 `legacy_joint_screening_v1`；
- 新报告标记 `screening_workflow_v2`。

## 14. 验收标准

### 14.1 Product Acceptance

- 一级初筛可以独立创建和完成；
- 质量不足自动进入复采；
- 风险或不确定结果自动进入标准筛查；
- 深蹲缺失不阻塞正式脊柱筛查报告；
- 必需证据缺失时无法生成正式报告；
- 每个状态都有主要动作；
- 报告明确区分初筛与正式筛查。

### 14.2 Scientific Acceptance

- 使用受试者独立或尽可能严格的数据划分；
- 提供外部或本地前瞻性验证；
- 完成镜像、平移、尺度、设备、衣物、光照和遮挡测试；
- 提供校准、不确定性和分布外处理；
- 产品阈值在锁定测试集之前确定；
- 不以探索性 8 特征或最低分段结果作为上线依据。

## 15. 文档关系

| Document | Purpose |
| --- | --- |
| `docs/PRD.md` | 产品目标、用户、范围与业务流程 |
| `docs/SPEC.md` | 权威实现规格 |
| `docs/PROTOCOL_API_CONTRACT.md` | 前后端协议与迁移契约 |
| `docs/REPORT_LOGIC.md` | 风险、证据、报告条件与动作规则 |
| `docs/TECH_ROADMAP.md` | 实施阶段与验证门槛 |

## 16. Revision History

| Version | Date | Changes |
| --- | --- | --- |
| 1.0.0 | 2026-04-18 | 单一深蹲产品规格 |
| 2.0.0-draft | 2026-07-29 | 重构为剪影一级分诊与标准筛查闭环 |
