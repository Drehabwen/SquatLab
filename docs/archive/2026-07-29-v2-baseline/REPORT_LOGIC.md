# RehabScreenLab V2 报告逻辑与筛查闭环

## 1. 报告目标

系统输出两种不同层级的结果：

1. `initial_triage_summary`：步态剪影一级分诊摘要；
2. `formal_screening_report`：完成标准筛查和必要人工复核后的正式筛查报告。

两者均为风险筛查结果，不是医学诊断，不输出 Cobb 角。

报告首先回答：

- 数据是否完整、质量是否可用；
- 当前属于低风险、关注、待复核还是需复采；
- 哪些证据支持该判断；
- 哪些证据冲突或缺失；
- 下一步具体做什么。

## 2. 证据层级

### 2.1 一级分诊证据

`gait_silhouette`

职责：

- 从标准化短步行序列提取全身轮廓方向性信号；
- 生成轻量模型分诊分数、置信度和分布外标记；
- 决定通过一级分诊、进入标准筛查、复采或人工复核。

限制：

- 不能单独生成正式报告；
- 不能输出诊断或 Cobb 角；
- 不能把模型分数称为患病概率；
- 不能把最低剪影分段称为已验证踝关节生物标志物。

### 2.2 标准筛查证据

#### Static Posture

职责：

- 记录静态站立时肩、躯干和骨盆方向性偏移；
- 验证剪影信号是否在静态姿态中持续存在；
- 输出方向和幅度，不只输出无方向不对称分数。

#### Adams Forward Bend

职责：

- 手机端引导动作、记录动作完成情况并留存证据；
- 受训人员录入胸段和腰段观察结果；
- 经验证设备测量的 ATR 可作为设备证据录入。

限制：

- 手机二维算法不得自动输出 Adams 严重度；
- 关键点高度差、轮廓差和模型分数不得表述为 ATR；
- 无人工观察记录时，Adams 不视为完成。

### 2.3 可选辅助证据

`squat`

职责：

- 描述重心偏移、膝髋控制和动态稳定性；
- 支持康复评估和复测；
- 为已有方向性姿态发现提供动作控制背景。

限制：

- 不是脊柱标准筛查必选项；
- 缺失不阻塞正式报告；
- 单项异常不能升级脊柱风险；
- 不与脊柱证据直接做分数相加。

## 3. 总体流程

```text
对象建档
→ 步态剪影一级采集
→ 自动质量门槛
  ├─ 不合格 → 复采
  ├─ 低风险且置信度合格 → 初筛摘要 → 周期复测/归档
  ├─ 风险或不确定 → 静态体态 + 人工 Adams
  └─ 分布外或异常冲突 → 人工复核
→ 检查标准筛查证据完整度
→ 处理冲突与强制复核
→ 生成正式筛查报告
→ 复测或归档
```

## 4. 核心对象

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

type EvidenceConsistency =
  | "none"
  | "single_protocol"
  | "multi_protocol_consistent"
  | "conflicting";
```

## 5. 数据完整度优先

报告规则必须先判断数据完整度，再判断风险。

### 5.1 一级摘要条件

必须满足：

- `gait_silhouette` 已完成；
- 关键质量检查通过；
- 镜像和方向状态已知；
- 模型输入不属于明显分布外，或已转人工复核。

不满足则：

```text
risk_level = recapture_needed 或 review_required
next_action = recapture 或 manual_review
```

### 5.2 正式报告条件

标准筛查被触发后，必须满足：

- 一级剪影结果可用，或人工升级原因有记录；
- 静态体态可用；
- Adams 有受训人员结构化记录；
- 所有强制复核已完成；
- 不存在未解决冲突；
- 没有必需协议处于 `needs_recapture`。

深蹲不在必需条件中。

## 6. 一级分诊规则

阈值必须来自锁定的本地验证方案；文档只定义规则形态。

```text
1. 关键质量检查失败
   → risk_level = recapture_needed
   → next_action = recapture

2. out_of_distribution = true
   → risk_level = review_required
   → next_action = manual_review

3. screening_score 位于低风险区间，且 confidence = high/medium
   → risk_level = low
   → next_action = pass_initial_triage

4. screening_score 位于不确定区间
   → risk_level = attention
   → next_action = start_standard_screening

5. screening_score 位于关注区间
   → risk_level = attention
   → next_action = start_standard_screening

6. 模型输出与实时质量、关键点或历史结果明显冲突
   → risk_level = review_required
   → next_action = manual_review
```

一级低风险只能表述为“本次初筛未见明显风险信号”，不能表述为“排除脊柱侧弯”。

## 7. 标准筛查规则

### 7.1 Adams 人工记录优先级

```text
1. Adams 动作未完成或证据不可用
   → recapture

2. 无受训人员记录
   → formal_report_ready = false
   → manual_review

3. 人工记录为明显异常
   → review_required
   → professional_evaluation 或 manual_review

4. 经验证设备 ATR 达到项目预设转介阈值
   → review_required
   → professional_evaluation

5. ATR 来源不明或由手机算法生成
   → 该字段无效
   → manual_review
```

设备阈值由临床方案单独配置，不写死在通用产品文档中。

### 7.2 跨协议一致性

高价值一致性：

- 剪影方向性偏移与静态躯干/骨盆偏移方向一致；
- 静态体态与人工 Adams 观察在侧别和区域上相互支持；
- 复测中相同模式持续出现。

辅助一致性：

- 深蹲重心偏移与静态方向一致；
- 该证据只能增加动作控制解释，不能替代 Adams。

### 7.3 证据冲突

以下进入 `pending_review`：

- 剪影高风险但静态与人工 Adams 均未见明显发现；
- 剪影低风险但人工 Adams 明显异常；
- 静态方向与 Adams 观察侧别相反；
- 镜像状态不确定；
- 不同复测结果变化超过预设范围；
- 自动结果与人工观察明显矛盾。

冲突不得通过平均分消除。

## 8. 风险模式

### 8.1 全身方向性偏移

证据：

- 步态剪影多区域中心偏移；
- 静态躯干或骨盆同方向偏移。

示例：

> 步态剪影与静态体态均观察到右侧方向性偏移，建议结合 Adams 人工观察完成标准筛查。

### 8.2 背部不对称人工观察

证据：

- 受训人员记录胸段或腰段不对称；
- 可选的经验证设备 ATR。

示例：

> 受训操作员在 Adams 前屈中记录到胸段右侧不对称，建议专业人员复核。

### 8.3 多协议一致风险

证据：

- 剪影、静态和人工 Adams 至少两类标准证据方向一致；
- 数据质量合格；
- 无未解决冲突。

示例：

> 多项筛查证据在右侧方向上具有一致性，建议进一步专业评估。

### 8.4 动作控制问题

证据：

- 深蹲重心偏移、膝内扣或联动不足。

示例：

> 深蹲中观察到右侧重心偏移，属于动作控制提示；该发现不单独代表脊柱筛查风险。

### 8.5 采集质量不足

证据：

- 全身未入框；
- 遮挡或分割破损；
- 镜像状态不明；
- 步态覆盖不足；
- Adams 动作未完成；
- 静态关键点缺失。

示例：

> 本次采集不满足分析条件，请按提示重新采集。系统未生成风险结论。

## 9. 风险等级与下一步动作

| Risk level | 含义 | 默认动作 |
| --- | --- | --- |
| `low` | 本次可用证据未见明显风险信号 | `pass_initial_triage` / `schedule_retest` |
| `attention` | 存在风险信号或不确定性 | `start_standard_screening` |
| `review_required` | 明显人工发现、证据冲突或分布外 | `manual_review` / `professional_evaluation` |
| `recapture_needed` | 输入质量不足 | `recapture` |

不得使用总分平均来覆盖：

- 采集质量失败；
- 人工 Adams 明显异常；
- 分布外输入；
- 未解决证据冲突。

## 10. 报告结构

### 10.1 Initial Triage Summary

包含：

- 对象和任务信息；
- 步态剪影采集质量；
- 初筛风险等级；
- 模型版本和置信度；
- 可解释的全身方向性发现；
- 下一步动作；
- 初筛免责声明。

固定提示：

> 本结果用于一级风险分诊，不代表医学诊断，也不能排除脊柱侧弯。若结果提示关注、数据不确定或存在其他临床疑虑，应完成标准筛查。

### 10.2 Formal Screening Report

顺序：

1. 基本信息；
2. 正式报告条件和数据完整度；
3. 采集质量；
4. 步态剪影初筛证据；
5. 静态体态证据；
6. Adams 人工观察与可选设备测量；
7. 可选动作控制证据；
8. 跨协议一致性和冲突；
9. 风险等级；
10. 下一步动作；
11. 复测安排；
12. 免责声明。

### 10.3 Adams 展示规则

必须显示证据来源：

- `受训人员观察`；
- `经验证设备测量`；
- `手机仅留存证据`。

禁止显示：

- `AI 计算 ATR`；
- `AI 判断肋峰严重度`；
- `AI 预测 Cobb 角`。

## 11. 正式报告规则引擎

按优先级执行：

```text
1. 任一必需证据质量失败
   → recapture_needed / recapture

2. Adams 人工记录缺失
   → formal_report_ready = false / manual_review

3. 经验证设备达到转介阈值，或人工 Adams 记录明显异常
   → review_required / professional_evaluation

4. 剪影 + 静态 + 人工 Adams 存在方向一致风险
   → review_required / manual_review 或 professional_evaluation

5. 标准证据轻度异常或相互不一致
   → attention 或 review_required / manual_review

6. 标准证据可用且均未见明显风险
   → low / schedule_retest 或 archive

7. 只有深蹲异常
   → 不改变脊柱 risk_level
   → 追加 movement_control_followup
```

## 12. 复测逻辑

复测比较：

- 使用相同协议版本和采集方向；
- 显示数据质量差异；
- 显示方向和幅度变化；
- 不把不同模型版本的分数直接作绝对变化解释；
- 明显变化、持续关注或结果冲突进入人工复核。

## 13. 数据库存储

建议对象：

```text
subjects
screening_sessions
protocol_results
capture_quality_checks
observer_records
device_measurements
integrated_reports
review_actions
retest_tasks
```

`observer_records` 至少包含：

- 操作者；
- 培训等级；
- 观察区域；
- 观察等级；
- 侧别；
- 证据引用；
- 时间戳。

`device_measurements` 至少包含：

- 测量类型；
- 数值和单位；
- 区域；
- 设备名称；
- 录入者；
- 测量时间。

## 14. 固定免责声明

初筛摘要：

> 本结果用于青少年姿态与脊柱风险的一级分诊，不作为医学诊断依据，也不能用于 Cobb 角估计。

正式筛查报告：

> 本报告整合步态剪影、静态体态和受训人员完成的 Adams 前屈筛查记录，用于风险筛查和后续任务安排，不作为医学诊断依据。如结果提示明显风险或存在临床疑虑，建议由专业人员进一步评估。

深蹲模块：

> 深蹲结果用于动作控制评估，不单独代表脊柱侧弯筛查结论。

## 15. 实施顺序

1. 将深蹲从必需协议调整为可选证据。
2. 将 Adams 改为手机证据采集与人工结构化录入。
3. 增加正式报告条件和数据完整度。
4. 增加步态剪影采集、自动质控和分诊结果。
5. 接入两级状态机与任务队列。
6. 增加复核和复测闭环。
7. 完成本地前瞻性验证后再锁定模型阈值。
