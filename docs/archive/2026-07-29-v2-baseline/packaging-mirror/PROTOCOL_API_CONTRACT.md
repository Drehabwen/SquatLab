# RehabScreenLab V2 联合筛查 API Contract

## 1. 目标与实施状态

本文定义“步态剪影一级分诊 → 静态体态与人工 Adams 标准筛查 → 报告/复核/复测”的 vNext 前后端契约。

当前实现已有：

- `static_posture`；
- `adams_forward_bend`；
- `squat`；
- 基础 `screening_session`、`protocol_result` 和综合报告。

待实现：

- `gait_silhouette`；
- 两级筛查模式；
- 自动质控详情；
- 正式报告条件；
- 新工作流状态。

迁移期间旧接口继续可用，不允许一次性破坏现有深蹲和三协议会话。

## 2. 设计原则

- 以 `screening_session` 为业务主对象。
- 协议结果统一结构，协议职责不同。
- 采集质量不足时先复采，不输出风险结论。
- 一级剪影只产生分诊结果，不直接产生正式报告。
- 手机端 Adams 只做引导、证据留存和结构化录入，不自动输出严重度或 ATR。
- 深蹲是可选动作证据，不阻塞脊柱筛查报告。
- 缺失证据必须进入状态和任务，不得默认为正常。
- 所有医学文案使用筛查、复核和进一步评估措辞。

## 3. 枚举

```ts
type ScreeningMode =
  | "rapid_triage"
  | "standard_screening"
  | "movement_followup";

type ProtocolType =
  | "gait_silhouette"
  | "static_posture"
  | "adams_forward_bend"
  | "squat";

type ProtocolRole =
  | "initial_triage"
  | "standard_screening"
  | "optional_support";

type ScreeningStatus =
  | "pending_initial_screening"
  | "initial_screening_in_progress"
  | "pending_standard_screening"
  | "pending_recapture"
  | "pending_review"
  | "pending_report"
  | "pending_retest"
  | "archived";

type ProtocolStatus =
  | "not_started"
  | "capturing"
  | "captured"
  | "analyzed"
  | "needs_recapture"
  | "needs_review"
  | "manually_recorded";

type CaptureQuality = "poor" | "acceptable" | "good";

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

type Direction = "left" | "right" | "forward" | "unclear";
type Confidence = "low" | "medium" | "high";
```

## 4. 通用对象

### 4.1 QualityCheck

```ts
type QualityCheck = {
  name: string;
  passed: boolean;
  value?: number | string | boolean;
  threshold?: number | string;
  message?: string;
};

type QualityDetails = {
  grade: CaptureQuality;
  passed: boolean;
  checks: QualityCheck[];
  blocking_reasons: string[];
};
```

兼容字段 `capture_quality` 继续保留；新代码以 `quality_details` 作为判定依据。

### 4.2 ProtocolResult

```ts
type ProtocolResult = {
  result_id: string;
  session_id: string;
  protocol: ProtocolType;
  protocol_role: ProtocolRole;
  status: ProtocolStatus;
  capture_quality: CaptureQuality;
  quality_details?: QualityDetails;
  metrics: Record<string, unknown>;
  findings: string[];
  risk_flags: string[];
  recommendations: string[];
  confidence?: Confidence;
  model_version?: string;
  evidence_source:
    | "mobile_algorithm"
    | "trained_observer"
    | "validated_device"
    | "combined";
  needs_recapture: boolean;
  needs_review: boolean;
  created_at: string;
  updated_at: string;
};
```

### 4.3 DataCompleteness

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

### 4.4 CrossProtocolEvidence

```ts
type CrossProtocolEvidence = {
  pattern: string;
  protocols: ProtocolType[];
  direction?: Direction;
  evidence: string[];
  confidence: Confidence;
  conflicts?: string[];
};
```

### 4.5 IntegratedReport

```ts
type IntegratedReport = {
  report_id: string;
  session_id: string;
  report_type: "initial_triage_summary" | "formal_screening_report";
  report_schema_version: "screening_workflow_v2";
  risk_level: RiskLevel;
  consistency_level:
    | "none"
    | "single_protocol"
    | "multi_protocol_consistent"
    | "conflicting";
  data_completeness: DataCompleteness;
  main_patterns: string[];
  cross_protocol_evidence: CrossProtocolEvidence[];
  next_action: NextAction;
  summary: string;
  recommendations: string[];
  disclaimer: string;
  created_at: string;
};
```

## 5. 对象与任务

### 5.1 Create Subject

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

### 5.2 Create Rapid Triage Session

`POST /api/v1/screening/sessions`

```json
{
  "subject_id": "subj-8f0c1d9a42",
  "mode": "rapid_triage"
}
```

服务端派生：

```json
{
  "session_id": "screen-2b8a67e91f",
  "mode": "rapid_triage",
  "status": "pending_initial_screening",
  "protocols": [
    {
      "protocol": "gait_silhouette",
      "protocol_role": "initial_triage",
      "required": true,
      "status": "not_started"
    }
  ],
  "next_action": "start_initial_screening"
}
```

### 5.3 Upgrade To Standard Screening

`POST /api/v1/screening/sessions/{session_id}/upgrade`

```json
{
  "reason": "silhouette_attention",
  "requested_by": "system"
}
```

升级后新增：

- `static_posture`，必需；
- `adams_forward_bend`，必需人工记录；
- `squat`，不自动新增；由专业人员按需选择。

### 5.4 Add Optional Protocol

`POST /api/v1/screening/sessions/{session_id}/protocols`

```json
{
  "protocol": "squat",
  "reason": "movement_control_followup"
}
```

## 6. 步态剪影协议

### 6.1 Register Capture

`POST /api/v1/screening/sessions/{session_id}/protocols/gait-silhouette/captures`

`multipart/form-data`：

- `video`：临时原始视频，可按隐私策略即时删除；
- `capture_metadata`：JSON；

```json
{
  "duration_seconds": 6.4,
  "camera_facing": "rear",
  "preview_mirrored": true,
  "device_model": "device-id",
  "retention_policy": "derived_only"
}
```

Response：

```json
{
  "capture_id": "cap-gait-001",
  "status": "captured",
  "raw_asset_retained": false
}
```

### 6.2 Analyze Gait Silhouette

`POST /api/v1/screening/sessions/{session_id}/protocols/gait-silhouette/analyze`

```json
{
  "capture_id": "cap-gait-001"
}
```

Response：`ProtocolResult`

```json
{
  "result_id": "res-gait-001",
  "session_id": "screen-2b8a67e91f",
  "protocol": "gait_silhouette",
  "protocol_role": "initial_triage",
  "status": "analyzed",
  "capture_quality": "good",
  "quality_details": {
    "grade": "good",
    "passed": true,
    "checks": [
      {"name": "full_body_visible", "passed": true},
      {"name": "mirror_state_known", "passed": true},
      {"name": "valid_frame_ratio", "passed": true, "value": 0.91}
    ],
    "blocking_reasons": []
  },
  "metrics": {
    "segment_count": 24,
    "feature_schema_version": "silhouette_lr_mean_v1",
    "screening_score": 0.41,
    "out_of_distribution": false,
    "directional_regions": [
      {"region": "trunk", "direction": "right", "magnitude": 0.04}
    ]
  },
  "findings": ["全身轮廓存在轻度方向性偏移信号"],
  "risk_flags": ["silhouette_directional_shift"],
  "recommendations": ["建议进入标准筛查进一步确认。"],
  "confidence": "medium",
  "model_version": "silhouette-logreg-v1",
  "evidence_source": "mobile_algorithm",
  "needs_recapture": false,
  "needs_review": false,
  "created_at": "2026-07-29T12:03:00+08:00",
  "updated_at": "2026-07-29T12:03:00+08:00"
}
```

模型内部特征向量不要求在常规响应中返回；如需审计，使用受控调试接口或内部特征存储。

## 7. 静态体态协议

`POST /api/v1/screening/sessions/{session_id}/protocols/static-posture/analyze`

兼容当前 `metrics` 提交形式。方向性指标必须同时记录幅度和方向。

```json
{
  "capture_quality": "good",
  "metrics": {
    "shoulder_height_diff_ratio": 0.04,
    "pelvis_height_diff_ratio": 0.03,
    "trunk_lateral_shift_ratio": 0.05,
    "suspected_direction": "right"
  }
}
```

`evidence_source` 可为 `mobile_algorithm` 或 `combined`。

## 8. Adams 人工记录协议

### 8.1 设计边界

手机端可以：

- 引导动作；
- 检查是否完成前屈和稳定停留；
- 保存经授权的证据图像或视频；
- 提供结构化录入表单。

手机端不可以：

- 自动给出胸段/腰段严重度；
- 从二维轮廓或关键点自动推算 ATR；
- 输出 Cobb 角或诊断。

### 8.2 Submit Observer Record

`POST /api/v1/screening/sessions/{session_id}/protocols/adams-forward-bend/records`

```json
{
  "capture_id": "cap-adams-001",
  "observer": {
    "observer_id": "staff-001",
    "training_level": "trained_screening_operator"
  },
  "observation": {
    "forward_bend_completed": true,
    "stable_hold_seconds": 2.5,
    "thoracic_observation": "mild",
    "lumbar_observation": "none",
    "suspected_side": "right",
    "notes": ""
  },
  "device_measurement": null
}
```

如使用经验证设备：

```json
{
  "device_measurement": {
    "measurement_type": "atr",
    "value_degrees": 6.0,
    "region": "thoracic",
    "device_name": "scoliometer",
    "entered_by": "staff-001",
    "measured_at": "2026-07-29T12:06:00+08:00"
  }
}
```

Response：`ProtocolResult`

```json
{
  "protocol": "adams_forward_bend",
  "protocol_role": "standard_screening",
  "status": "manually_recorded",
  "capture_quality": "good",
  "metrics": {
    "thoracic_observation": "mild",
    "lumbar_observation": "none",
    "suspected_side": "right",
    "atr_degrees": null
  },
  "findings": ["受训操作员记录胸段右侧轻度不对称"],
  "risk_flags": ["observer_adams_thoracic_right"],
  "confidence": "medium",
  "evidence_source": "trained_observer",
  "needs_recapture": false,
  "needs_review": true
}
```

## 9. 深蹲可选协议

现有接口继续保留：

- `POST /api/v1/squat/assessments`；
- `GET /api/v1/squat/sessions`；
- `POST /api/v1/squat/reports/preview`。

映射到联合筛查时：

```json
{
  "protocol": "squat",
  "protocol_role": "optional_support",
  "required": false
}
```

规则：

- 未完成深蹲不影响 `formal_report_ready`；
- 深蹲异常不能单独触发脊柱专业评估；
- 深蹲结果只进入动作控制、康复随访和跨协议辅助证据。

## 10. 报告条件

### 10.1 Get Formal Report Conditions

`GET /api/v1/screening/sessions/{session_id}/formal-report-conditions`

```json
{
  "required_protocols": [
    "gait_silhouette",
    "static_posture",
    "adams_forward_bend"
  ],
  "completed_protocols": [
    "gait_silhouette",
    "static_posture"
  ],
  "usable_protocols": [
    "gait_silhouette",
    "static_posture"
  ],
  "missing_protocols": [
    "adams_forward_bend"
  ],
  "blocking_reasons": [
    "adams_observer_record_missing"
  ],
  "formal_report_ready": false
}
```

若一级剪影因设备或无障碍原因无法完成，可由人工记录升级依据；系统必须保留 `initial_triage_override_reason`，不得静默跳过。

## 11. 报告接口

### 11.1 Generate Initial Triage Summary

`POST /api/v1/screening/sessions/{session_id}/reports/initial-triage`

只消费一级剪影结果，输出：

```json
{
  "report_type": "initial_triage_summary",
  "risk_level": "attention",
  "next_action": "start_standard_screening",
  "data_completeness": {
    "formal_report_ready": false
  }
}
```

### 11.2 Generate Formal Screening Report

`POST /api/v1/screening/sessions/{session_id}/reports/formal`

前置条件：

- `formal_report_ready = true`；
- 必需人工复核已完成；
- 不存在未处理冲突。

否则返回 `409 FormalReportConditionsNotMet`：

```json
{
  "error": "formal_report_conditions_not_met",
  "blocking_reasons": ["adams_observer_record_missing"],
  "next_action": "manual_review"
}
```

## 12. 兼容迁移

### 12.1 旧状态映射

| Legacy | V2 |
| --- | --- |
| `in_progress` | 根据协议进度映射到初筛或标准筛查中 |
| `pending_recapture` | `pending_recapture` |
| `pending_review` | `pending_review` |
| `pending_report` | `pending_report` |
| `completed` | `pending_retest` 或 `archived` |

### 12.2 旧报告

- 旧三协议报告标记 `legacy_joint_screening_v1`；
- 不反向要求旧报告补做剪影；
- 新会话默认使用 `screening_workflow_v2`；
- 旧深蹲快捷评估继续作为独立 Movement Follow-up。

## 13. 错误与审计

必须记录：

- 模型版本和特征 schema；
- 采集设备和镜像状态；
- 质量检查结果；
- 人工 Adams 录入者；
- ATR 测量来源；
- 人工覆盖或升级原因；
- 报告生成者与审核者；
- 状态转换时间线。

关键错误：

- `CaptureQualityInsufficient`；
- `UnknownMirrorState`；
- `OutOfDistributionInput`；
- `ObserverRecordMissing`；
- `ValidatedDeviceSourceMissing`；
- `FormalReportConditionsNotMet`；
- `UnresolvedEvidenceConflict`。
