# 联合筛查 API Contract 草案

## 1. 目标

本文定义下一阶段“静态体态 + Adams 前屈 + 深蹲动作”联合筛查所需的前后端数据契约。它是 vNext 设计草案，不要求一次性替换当前深蹲接口。

设计原则：

- 以一次 `screening_session` 作为业务主对象。
- 每个采集协议输出统一的 `protocol_result`。
- 报告只消费结构化协议结果，不直接依赖前端页面状态。
- 采集质量不足时进入复采状态，不强行给出结论。
- 所有医学相关表达使用“筛查提示、建议复核、建议进一步评估”，不使用诊断语言。

## 2. 枚举定义

```ts
type ProtocolType =
  | "static_posture"
  | "adams_forward_bend"
  | "squat";

type ScreeningStatus =
  | "in_progress"
  | "pending_report"
  | "completed"
  | "pending_recapture"
  | "pending_review"
  | "archived";

type ProtocolStatus =
  | "not_started"
  | "capturing"
  | "captured"
  | "analyzed"
  | "needs_recapture"
  | "needs_review";

type CaptureQuality = "poor" | "acceptable" | "good";

type OverallRisk =
  | "low"
  | "attention"
  | "review_required"
  | "recapture_needed";

type NextAction =
  | "pass"
  | "retest_later"
  | "recapture"
  | "manual_review"
  | "professional_evaluation";

type Direction = "left" | "right" | "forward" | "unclear";

type Confidence = "low" | "medium" | "high";
```

## 3. 通用响应结构

### 3.1 ProtocolResult

```ts
type ProtocolResult = {
  result_id: string;
  session_id: string;
  protocol: ProtocolType;
  status: ProtocolStatus;
  capture_quality: CaptureQuality;
  metrics: Record<string, number | string | boolean | null>;
  findings: string[];
  risk_flags: string[];
  recommendations: string[];
  needs_recapture: boolean;
  needs_review: boolean;
  created_at: string;
  updated_at: string;
};
```

### 3.2 CrossProtocolEvidence

```ts
type CrossProtocolEvidence = {
  pattern: string;
  protocols: ProtocolType[];
  direction?: Direction;
  evidence: string[];
  confidence: Confidence;
};
```

### 3.3 IntegratedReport

```ts
type IntegratedReport = {
  report_id: string;
  session_id: string;
  title: string;
  overall_risk: OverallRisk;
  consistency_level: "none" | "single_protocol" | "multi_protocol_consistent";
  main_patterns: string[];
  cross_protocol_evidence: CrossProtocolEvidence[];
  next_action: NextAction;
  summary: string;
  recommendations: string[];
  disclaimer: string;
  created_at: string;
};
```

## 4. 受试者与筛查任务

### 4.1 Create Subject

`POST /api/v1/subjects`

```json
{
  "display_name": "学生001",
  "sex": "female",
  "age": 12,
  "height_cm": 152,
  "notes": ""
}
```

Response:

```json
{
  "subject_id": "subj-8f0c1d9a42",
  "display_name": "学生001",
  "sex": "female",
  "age": 12,
  "height_cm": 152,
  "notes": "",
  "created_at": "2026-04-29T12:00:00+00:00"
}
```

### 4.2 Create Screening Session

`POST /api/v1/screening/sessions`

```json
{
  "subject_id": "subj-8f0c1d9a42",
  "protocols": ["static_posture", "adams_forward_bend", "squat"]
}
```

Response:

```json
{
  "session_id": "screen-2b8a67e91f",
  "subject_id": "subj-8f0c1d9a42",
  "status": "in_progress",
  "protocols": [
    {
      "protocol": "static_posture",
      "status": "not_started"
    },
    {
      "protocol": "adams_forward_bend",
      "status": "not_started"
    },
    {
      "protocol": "squat",
      "status": "not_started"
    }
  ],
  "created_at": "2026-04-29T12:01:00+00:00"
}
```

### 4.3 Get Screening Session

`GET /api/v1/screening/sessions/{session_id}`

Response:

```json
{
  "session_id": "screen-2b8a67e91f",
  "subject_id": "subj-8f0c1d9a42",
  "status": "pending_report",
  "protocol_results": [],
  "integrated_report": null,
  "created_at": "2026-04-29T12:01:00+00:00",
  "completed_at": null
}
```

## 5. 协议分析接口

第一版可以让三个协议分别提交结构化指标。后续再把图像/视频分析接进来。

### 5.1 Static Posture Analyze

`POST /api/v1/screening/sessions/{session_id}/protocols/static-posture/analyze`

Request:

```json
{
  "capture_quality": "good",
  "metrics": {
    "shoulder_height_diff_ratio": 0.04,
    "pelvis_height_diff_ratio": 0.03,
    "trunk_lateral_shift_ratio": 0.05,
    "forward_head_ratio": 0.08,
    "knee_alignment": "neutral",
    "suspected_direction": "right"
  }
}
```

Response: `ProtocolResult`

```json
{
  "result_id": "res-static-001",
  "session_id": "screen-2b8a67e91f",
  "protocol": "static_posture",
  "status": "analyzed",
  "capture_quality": "good",
  "metrics": {
    "shoulder_height_diff_ratio": 0.04,
    "pelvis_height_diff_ratio": 0.03,
    "trunk_lateral_shift_ratio": 0.05,
    "forward_head_ratio": 0.08,
    "knee_alignment": "neutral",
    "suspected_direction": "right"
  },
  "findings": ["右肩偏高", "躯干轻度右偏"],
  "risk_flags": ["static_trunk_asymmetry_right"],
  "recommendations": ["建议结合前屈筛查和动态动作结果进行综合判断。"],
  "needs_recapture": false,
  "needs_review": false,
  "created_at": "2026-04-29T12:03:00+00:00",
  "updated_at": "2026-04-29T12:03:00+00:00"
}
```

### 5.2 Adams Forward Bend Analyze

`POST /api/v1/screening/sessions/{session_id}/protocols/adams-forward-bend/analyze`

Request:

```json
{
  "capture_quality": "good",
  "metrics": {
    "forward_bend_completed": true,
    "stable_hold_seconds": 2.4,
    "thoracic_asymmetry": "moderate",
    "lumbar_asymmetry": "mild",
    "suspected_side": "right",
    "trunk_rotation_sign": true,
    "confidence": "medium"
  }
}
```

Response: `ProtocolResult`

```json
{
  "result_id": "res-adams-001",
  "session_id": "screen-2b8a67e91f",
  "protocol": "adams_forward_bend",
  "status": "needs_review",
  "capture_quality": "good",
  "metrics": {
    "forward_bend_completed": true,
    "stable_hold_seconds": 2.4,
    "thoracic_asymmetry": "moderate",
    "lumbar_asymmetry": "mild",
    "suspected_side": "right",
    "trunk_rotation_sign": true,
    "confidence": "medium"
  },
  "findings": ["胸段右侧不对称较明显", "腰段右侧轻度不对称"],
  "risk_flags": ["adams_thoracic_asymmetry_right"],
  "recommendations": ["建议由专业人员复核本次前屈筛查证据。"],
  "needs_recapture": false,
  "needs_review": true,
  "created_at": "2026-04-29T12:05:00+00:00",
  "updated_at": "2026-04-29T12:05:00+00:00"
}
```

### 5.3 Squat Analyze

`POST /api/v1/screening/sessions/{session_id}/protocols/squat/analyze`

Request:

```json
{
  "capture_quality": "acceptable",
  "metrics": {
    "squat_count": 6,
    "knee_sway_ratio": 0.08,
    "knee_valgus_angle": 9,
    "center_deviation_ratio": 0.06,
    "left_right_symmetry": 0.9,
    "linkage_smoothness": 0.82,
    "squat_depth_ratio": 0.78,
    "dynamic_shift_direction": "right"
  }
}
```

Response: `ProtocolResult`

```json
{
  "result_id": "res-squat-001",
  "session_id": "screen-2b8a67e91f",
  "protocol": "squat",
  "status": "analyzed",
  "capture_quality": "acceptable",
  "metrics": {
    "squat_count": 6,
    "knee_sway_ratio": 0.08,
    "knee_valgus_angle": 9,
    "center_deviation_ratio": 0.06,
    "left_right_symmetry": 0.9,
    "linkage_smoothness": 0.82,
    "squat_depth_ratio": 0.78,
    "dynamic_shift_direction": "right"
  },
  "findings": ["动作整体可用，存在轻度右侧重心偏移"],
  "risk_flags": ["dynamic_weight_shift_right"],
  "recommendations": ["建议结合静态体态结果观察是否存在同方向偏移。"],
  "needs_recapture": false,
  "needs_review": false,
  "created_at": "2026-04-29T12:08:00+00:00",
  "updated_at": "2026-04-29T12:08:00+00:00"
}
```

## 6. 综合报告接口

### 6.1 Generate Integrated Report

`POST /api/v1/screening/sessions/{session_id}/reports/integrated`

Request:

```json
{}
```

Response: `IntegratedReport`

```json
{
  "report_id": "report-1f82d4a9",
  "session_id": "screen-2b8a67e91f",
  "title": "姿态与动作联合筛查报告",
  "overall_risk": "review_required",
  "consistency_level": "multi_protocol_consistent",
  "main_patterns": [
    "trunk_asymmetry_right",
    "dynamic_weight_shift_right"
  ],
  "cross_protocol_evidence": [
    {
      "pattern": "trunk_asymmetry_right",
      "protocols": ["static_posture", "adams_forward_bend", "squat"],
      "direction": "right",
      "evidence": [
        "静态体态观察到躯干轻度右偏",
        "Adams 前屈观察到胸段右侧不对称较明显",
        "深蹲动作观察到轻度右侧重心偏移"
      ],
      "confidence": "medium"
    }
  ],
  "next_action": "manual_review",
  "summary": "右侧相关不对称在静态体态、Adams 前屈和深蹲动作中均有体现，建议专业人员复核。",
  "recommendations": [
    "建议进行人工复核，确认本次筛查证据是否稳定。",
    "如复核仍提示明显风险，建议进一步专业评估。"
  ],
  "disclaimer": "本报告用于姿态与动作风险筛查参考，不作为医学诊断依据。如筛查结果提示明显风险，建议由专业人员进一步评估。",
  "created_at": "2026-04-29T12:10:00+00:00"
}
```

### 6.2 Get Integrated Report

`GET /api/v1/screening/sessions/{session_id}/reports/integrated`

返回已生成的综合报告。如果不存在，返回 `404 NotFoundError`。

## 7. 历史记录接口

### 7.1 List Screening Sessions

`GET /api/v1/screening/sessions`

Query:

```text
subject_id?: string
status?: ScreeningStatus
limit?: number
```

Response:

```json
[
  {
    "session_id": "screen-2b8a67e91f",
    "subject_id": "subj-8f0c1d9a42",
    "subject_display_name": "学生001",
    "status": "completed",
    "overall_risk": "review_required",
    "next_action": "manual_review",
    "completed_protocols": ["static_posture", "adams_forward_bend", "squat"],
    "created_at": "2026-04-29T12:01:00+00:00",
    "completed_at": "2026-04-29T12:10:00+00:00"
  }
]
```

## 8. 兼容当前深蹲接口

当前接口可以保留：

- `POST /api/v1/squat/assessments`
- `GET /api/v1/squat/sessions`
- `POST /api/v1/squat/reports/preview`

迁移策略：

1. 保持现有深蹲页面可用。
2. 新增联合筛查接口。
3. 将现有深蹲结果在服务端映射为 `ProtocolResult(protocol="squat")`。
4. 前端历史记录逐步从 `squat_sessions` 迁移到 `screening_sessions`。
5. 旧深蹲接口可作为快捷评估入口长期保留。

## 9. 第一阶段实现建议

优先实现后端纯结构闭环，不急于把所有图像算法一次接入：

1. 新增 Pydantic schemas。
2. 新增 SQLite 表：`subjects`、`screening_sessions`、`protocol_results`、`integrated_reports`。
3. 新增 `screening` 路由。
4. 把深蹲评分服务包装成 `ProtocolResult`。
5. 静态体态和 Adams 先接受结构化 mock metrics。
6. 实现综合报告规则引擎。
7. 前端增加联合筛查工作台和报告预览。
