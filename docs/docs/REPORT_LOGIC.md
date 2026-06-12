# 报告逻辑与数据流

## 1. 产品目标

本系统面向姿态与动作风险筛查，不输出医学诊断结论。第一阶段报告围绕三类证据形成联合解释：

- 静态体态评估
- Adams 前屈早筛
- 深蹲动作评估

报告的核心价值不是给出一个简单总分，而是判断单项发现是否互相印证，并给出下一步动作。

## 2. 总体数据流

```text
受试者建档
-> 创建筛查任务
-> 完成静态体态采集
-> 完成 Adams 前屈采集
-> 完成深蹲动作采集
-> 生成单项协议结果
-> 生成联合解释
-> 生成综合报告
-> 进入历史记录或复查队列
```

## 3. 核心对象

### 3.1 ScreeningSession

一次完整筛查任务。

```ts
type ScreeningSession = {
  session_id: string;
  subject_id: string;
  status: "in_progress" | "pending_report" | "completed" | "pending_recapture" | "pending_review";
  created_at: string;
  completed_at?: string;
  protocols: ProtocolResult[];
  integrated_result?: IntegratedResult;
};
```

### 3.2 ProtocolResult

每个协议独立输出，但结构保持统一。

```ts
type ProtocolType = "static_posture" | "adams_forward_bend" | "squat";

type CaptureQuality = "poor" | "acceptable" | "good";

type ProtocolResult = {
  protocol: ProtocolType;
  status: "not_started" | "captured" | "analyzed" | "needs_recapture" | "needs_review";
  capture_quality: CaptureQuality;
  metrics: Record<string, number | string | boolean | null>;
  findings: string[];
  risk_flags: string[];
  recommendations: string[];
  needs_recapture: boolean;
  needs_review: boolean;
};
```

### 3.3 IntegratedResult

综合报告的结构化结果。

```ts
type OverallRisk = "low" | "attention" | "review_required" | "recapture_needed";

type NextAction =
  | "pass"
  | "retest_later"
  | "recapture"
  | "manual_review"
  | "professional_evaluation";

type IntegratedResult = {
  overall_risk: OverallRisk;
  consistency_level: "none" | "single_protocol" | "multi_protocol_consistent";
  main_patterns: string[];
  cross_protocol_evidence: CrossProtocolEvidence[];
  next_action: NextAction;
  summary: string;
  recommendations: string[];
};
```

### 3.4 CrossProtocolEvidence

用于解释“为什么系统认为多个协议互相印证”。

```ts
type CrossProtocolEvidence = {
  pattern: string;
  protocols: ProtocolType[];
  direction?: "left" | "right" | "forward" | "unclear";
  evidence: string[];
  confidence: "low" | "medium" | "high";
};
```

## 4. 三类协议职责

### 4.1 静态体态评估

回答：静态站立时是否存在明显姿态偏差。

第一版指标：

- 高低肩
- 骨盆倾斜
- 躯干侧偏
- 头颈前引
- 静态膝内扣或膝外翻趋势

典型输出：

```json
{
  "protocol": "static_posture",
  "findings": ["右肩偏高", "躯干轻度右偏"],
  "risk_flags": ["static_trunk_asymmetry"],
  "needs_review": false
}
```

### 4.2 Adams 前屈早筛

回答：前屈状态下是否存在背部左右不对称，是否需要复采或人工复核。

第一版指标：

- 前屈动作是否完成
- 峰值前屈稳定窗口是否可用
- 胸段左右不对称
- 腰段左右不对称
- 疑似凸侧
- 躯干旋转征提示

Adams 结果使用筛查语言，不输出 Cobb 角，不给诊断结论。

典型输出：

```json
{
  "protocol": "adams_forward_bend",
  "findings": ["胸段右侧隆起较明显"],
  "risk_flags": ["adams_thoracic_asymmetry_right"],
  "needs_review": true
}
```

### 4.3 深蹲动作评估

回答：静态或前屈发现是否在动态动作控制中体现。

第一版指标：

- 下蹲深度
- 膝内扣
- 重心偏移
- 左右对称性
- 髋膝踝联动
- 躯干前倾或侧偏

典型输出：

```json
{
  "protocol": "squat",
  "findings": ["重心存在右侧偏移", "左右发力与节奏不够对称"],
  "risk_flags": ["dynamic_weight_shift_right", "dynamic_asymmetry"],
  "needs_review": false
}
```

## 5. 联合解释逻辑

报告不做三项分数相加。推荐流程：

```text
单项协议结果
-> 风险标记归类
-> 判断方向和部位是否一致
-> 生成跨协议证据
-> 生成整体风险等级
-> 生成下一步动作
```

## 6. 主要风险模式

### 6.1 脊柱/躯干不对称模式

证据来源：

- 静态体态：高低肩、躯干侧偏
- Adams：胸段或腰段左右不对称
- 深蹲：躯干侧偏、重心偏移

示例解释：

```text
右侧相关不对称在静态体态、Adams 前屈和深蹲动作中均有体现，建议人工复核。
```

### 6.2 骨盆-下肢控制模式

证据来源：

- 静态体态：骨盆倾斜、膝内扣趋势
- 深蹲：膝内扣、重心偏移、左右不对称

示例解释：

```text
静态骨盆倾斜与动态重心偏移方向一致，提示下肢控制和躯干稳定需要关注。
```

### 6.3 活动度受限模式

证据来源：

- 静态体态：代偿姿态线索
- 深蹲：深度不足、联动平滑度不足

示例解释：

```text
深蹲深度和髋膝踝联动表现不足，建议后续复查动作模式和关节活动度。
```

### 6.4 采集质量不足模式

证据来源：

- 任一协议关键点缺失
- 入框不完整
- 视角错误
- 动作未完成
- 峰值稳定窗口不足

示例解释：

```text
本次 Adams 前屈采集质量不足，建议重新采集后再生成正式筛查结论。
```

### 6.5 单项异常但未互相印证

证据来源：

- 仅一个协议出现轻度异常
- 其他协议未出现同方向或同部位证据

示例解释：

```text
本次仅在深蹲动作中观察到轻度控制问题，未见静态体态和 Adams 前屈结果支持同类风险。
```

## 7. 整体风险等级

```ts
type OverallRisk =
  | "low"
  | "attention"
  | "review_required"
  | "recapture_needed";
```

含义：

| 等级 | 含义 |
| --- | --- |
| `low` | 暂未见明显风险 |
| `attention` | 存在单项异常或轻度不一致，建议观察或复查 |
| `review_required` | 多协议一致异常，或 Adams 出现明显异常，建议人工复核 |
| `recapture_needed` | 采集质量不足，需要重新采集 |

## 8. 下一步动作

```ts
type NextAction =
  | "pass"
  | "retest_later"
  | "recapture"
  | "manual_review"
  | "professional_evaluation";
```

| 动作 | 说明 |
| --- | --- |
| `pass` | 本次未见明显异常，按周期复查 |
| `retest_later` | 有轻度姿态或动作控制问题，建议 4-8 周后复查 |
| `recapture` | 采集质量不足，建议重新采集 |
| `manual_review` | 多项结果存在一致性异常，建议专业人员复核 |
| `professional_evaluation` | 筛查提示明显风险，建议进一步专业评估 |

## 9. 第一版规则引擎

按优先级执行：

```text
1. 如果任一必需协议 capture_quality = poor
   -> overall_risk = recapture_needed
   -> next_action = recapture

2. 如果 Adams = moderate 或 marked
   -> overall_risk = review_required
   -> next_action = manual_review

3. 如果 Adams = mild，且静态体态存在同侧肩/躯干/骨盆不对称
   -> overall_risk = review_required
   -> next_action = manual_review

4. 如果静态体态和深蹲出现同方向偏移
   -> overall_risk = attention
   -> next_action = retest_later

5. 如果只有深蹲轻度控制问题
   -> overall_risk = attention
   -> next_action = retest_later

6. 如果三个协议均无明显异常
   -> overall_risk = low
   -> next_action = pass
```

## 10. 报告结构

### 10.1 基本信息

- 受试者姓名或编号
- 年龄
- 性别
- 筛查日期
- 筛查项目完成情况

### 10.2 采集质量

- 静态体态：好 / 可用 / 需复采
- Adams 前屈：好 / 可用 / 需复采
- 深蹲动作：好 / 可用 / 需复采

### 10.3 单项结果

- 静态体态发现
- Adams 前屈筛查发现
- 深蹲动作控制发现

### 10.4 联合解释

- 是否存在跨协议一致性
- 主要风险模式
- 哪些发现相互印证
- 哪些发现仅为单项提示

### 10.5 建议动作

- 通过
- 周期复查
- 重新采集
- 人工复核
- 进一步专业评估

### 10.6 免责声明

建议固定文案：

```text
本报告用于姿态与动作风险筛查参考，不作为医学诊断依据。如筛查结果提示明显风险，建议由专业人员进一步评估。
```

## 11. 数据库存储建议

第一版保持简单，协议结果中的指标使用 JSON 存储，便于快速迭代。

```text
subjects
screening_sessions
protocol_results
integrated_reports
```

### 11.1 protocol_results

```text
id
session_id
protocol_type
status
capture_quality
metrics_json
findings_json
risk_flags_json
recommendations_json
needs_recapture
needs_review
created_at
```

### 11.2 integrated_reports

```text
session_id
overall_risk
consistency_level
main_patterns_json
cross_protocol_evidence_json
next_action
summary
recommendations_json
created_at
```

## 12. 实施顺序

1. 增加统一协议结果类型。
2. 将现有深蹲结果映射为 `ProtocolResult`。
3. 新增静态体态协议结果结构。
4. 新增 Adams 前屈协议结果结构。
5. 实现第一版规则引擎。
6. 改造报告预览为综合报告。
7. 改造历史记录为筛查任务维度。
