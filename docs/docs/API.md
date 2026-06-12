# API Documentation: SquatLab V1.0

## 1. Overview

| Topic | Value |
|-------|-------|
| Base URL | `http://localhost:8010` |
| API Version | `v1` |
| Service Version | `1.0.0` |
| Content-Type | `application/json` |
| Encoding | `UTF-8` |

## 2. Base Endpoints

### 2.1 GET /health

健康检查接口。

**Response 200**

```json
{
  "status": "ok",
  "service": "SquatLab API",
  "version": "1.0.0"
}
```

### 2.2 GET /ready

服务就绪检查接口，额外校验数据库表是否完整。

**Response 200**

```json
{
  "status": "ok",
  "service": "SquatLab API",
  "version": "1.0.0"
}
```

## 3. Camera Endpoints

Base Path: `/api/v1/camera`

### 3.1 GET /api/v1/camera/status

返回姿态检测依赖状态。

**Response 200**

```json
{
  "available": true,
  "backend": "mediapipe_tasks",
  "detail": "Pose detection ready."
}
```

### 3.2 POST /api/v1/camera/sessions

创建一次实时分析会话。

**Response 201**

```json
{
  "session_id": "live-0f3f83e710c2"
}
```

### 3.3 DELETE /api/v1/camera/sessions/{session_id}

关闭一次实时分析会话。

**Response 204**

无响应体。

### 3.4 POST /api/v1/camera/analyze-frame

上传单帧图像并返回关键点与实时指标。

**Request**

```json
{
  "session_id": "live-0f3f83e710c2",
  "view_mode": "front",
  "frame_data_url": "data:image/jpeg;base64,..."
}
```

**Response 200**

```json
{
  "session_id": "live-0f3f83e710c2",
  "view_mode": "front",
  "has_detection": true,
  "frame_width": 640,
  "frame_height": 480,
  "detector_backend": "mediapipe_tasks",
  "readiness_state": "capturing",
  "missing_keypoints": [],
  "min_keypoint_visibility": 0.35,
  "pose_connections": [
    ["left_shoulder", "right_shoulder"],
    ["left_hip", "right_hip"]
  ],
  "keypoints": [
    {
      "name": "left_hip",
      "x": 0.45,
      "y": 0.55,
      "z": 0.0,
      "visibility": 0.99
    }
  ],
  "live_metrics": {
    "squat_count": 0,
    "knee_sway_ratio": 0.08,
    "knee_valgus_angle": 9,
    "center_deviation_ratio": 0.06,
    "left_right_symmetry": 0.9,
    "linkage_smoothness": 0.82,
    "squat_depth_ratio": 0.78,
    "tempo_seconds": null
  }
}
```

## 4. Squat Assessment Endpoints

Base Path: `/api/v1/squat`

### 4.1 POST /api/v1/squat/assessments

创建一次深蹲视觉评估结果并入库。

**Request**

```json
{
  "squat_count": 12,
  "knee_sway_ratio": 0.08,
  "knee_valgus_angle": 9,
  "center_deviation_ratio": 0.06,
  "left_right_symmetry": 0.9,
  "linkage_smoothness": 0.82,
  "squat_depth_ratio": 0.78
}
```

**Fields**

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `squat_count` | int | `1-100` | 深蹲次数 |
| `knee_sway_ratio` | float | `0-1` | 膝部左右晃动比例 |
| `knee_valgus_angle` | float | `0-60` | 膝部内扣角度 |
| `center_deviation_ratio` | float | `0-1` | 身体中心相对踝部中心的偏移比例 |
| `left_right_symmetry` | float | `0-1` | 左右动作对称性 |
| `linkage_smoothness` | float | `0-1` | 髋膝踝联动顺畅度 |
| `squat_depth_ratio` | float | `0-1` | 下蹲深度比例 |

**Response 201**

```json
{
  "session_id": "squat-a1b2c3d4e5f6",
  "overall_score": 84,
  "front_score": 86,
  "side_score": 82,
  "findings": [
    "膝部内扣趋势明显"
  ],
  "summary": "本次深蹲视觉评分为 84 分，正面得分 86，侧面得分 82，主要观察到：膝部内扣趋势明显。",
  "suggestions": [
    "存在膝内扣趋势，注意膝盖方向与脚尖方向保持一致。"
  ]
}
```

### 4.2 GET /api/v1/squat/sessions

获取历史评估记录列表。

**Response 200**

```json
[
  {
    "session_id": "squat-a1b2c3d4e5f6",
    "squat_count": 12,
    "overall_score": 84,
    "summary": "本次深蹲视觉评分为 84 分。",
    "created_at": "2026-04-18T12:00:00+00:00"
  }
]
```

### 4.3 POST /api/v1/squat/reports/preview

生成单次评估记录的报告预览。

**Request**

```json
{
  "session_id": "squat-a1b2c3d4e5f6"
}
```

**Response 200**

```json
{
  "session_id": "squat-a1b2c3d4e5f6",
  "title": "深蹲视觉评分报告",
  "summary": "本次深蹲视觉评分为 84 分，正面得分 86，侧面得分 82。",
  "findings": [
    "膝部内扣趋势明显"
  ],
  "recommendations": [
    "存在膝内扣趋势，注意膝盖方向与脚尖方向保持一致。"
  ]
}
```

## 5. Error Format

业务错误统一返回：

```json
{
  "error": {
    "message": "Session not found: squat-missing",
    "type": "NotFoundError"
  }
}
```

参数校验错误保持 FastAPI 默认结构。

## 6. Scoring Summary

评估分为正面视角和侧面视角两个子分数：

- `front_score`：由 `knee_sway_ratio`、`knee_valgus_angle`、`center_deviation_ratio`、`left_right_symmetry` 计算。
- `side_score`：由 `linkage_smoothness` 和 `squat_depth_ratio` 计算。
- `overall_score`：`front_score * 0.5 + side_score * 0.5` 后四舍五入。

## 7. Persistence

当前 SQLite 使用以下表：

- `squat_sessions`
- `squat_visual_assessments`

其中 `squat_sessions` 保存每次检测的基础摘要，`squat_visual_assessments` 保存正侧面评分、动作提醒和改进建议。
