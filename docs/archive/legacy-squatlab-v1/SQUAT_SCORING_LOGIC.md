# 深蹲评分逻辑文档

## 1. 概述

本文定义 SquatLab 当前视觉评分逻辑。目标是把可观察的深蹲动作表现转化为可复现、可测试、可调整的评分结果。

当前版本使用 2D 姿态关键点和归一化指标。评分结果用于训练反馈，不用于医疗诊断。

## 2. 输入指标

### 正面视角

| 指标 | 范围 | 含义 |
| --- | --- | --- |
| `knee_sway_ratio` | 0-1 | 膝部左右晃动程度 |
| `knee_valgus_angle` | 0-60 | 膝内扣趋势角度 |
| `center_deviation_ratio` | 0-1 | 身体重心相对脚部中心的偏移 |
| `left_right_symmetry` | 0-1 | 左右动作和发力节奏对称性 |

### 侧面视角

| 指标 | 范围 | 含义 |
| --- | --- | --- |
| `linkage_smoothness` | 0-1 | 髋膝踝联动平滑度 |
| `squat_depth_ratio` | 0-1 | 下蹲深度比例 |

## 3. 正面评分

```python
sway_score = clamp01(1 - knee_sway_ratio / 0.12)
valgus_score = clamp01(1 - knee_valgus_angle / 20.0)
center_score = clamp01(1 - center_deviation_ratio / 0.15)
symmetry_score = clamp01(left_right_symmetry)

front_score = round(100 * (
    sway_score * 0.30
    + valgus_score * 0.25
    + center_score * 0.20
    + symmetry_score * 0.25
))
```

## 4. 侧面评分

```python
linkage_score = clamp01(linkage_smoothness)
depth_score = clamp01(squat_depth_ratio)

side_score = round(100 * (
    linkage_score * 0.55
    + depth_score * 0.45
))
```

## 5. 综合评分

```python
overall_score = round(front_score * 0.50 + side_score * 0.50)
```

## 6. 发现项阈值

| 条件 | 发现项 |
| --- | --- |
| `knee_sway_ratio > 0.08` | 膝部左右晃动较明显 |
| `knee_valgus_angle > 10` | 膝部内扣趋势明显 |
| `center_deviation_ratio > 0.10` | 重心存在单侧偏移 |
| `left_right_symmetry < 0.85` | 左右发力与节奏不够对称 |
| `linkage_smoothness < 0.70` | 髋膝踝联动不够顺畅 |
| `squat_depth_ratio < 0.70` | 下蹲深度不足 |

## 7. 建议生成

建议按固定优先级生成，最多返回 3 条。如果没有明显异常，返回正向反馈：

```text
本次视觉评分显示动作整体稳定，可在下一阶段加入节奏控制或轻负重进阶。
```

## 8. 已知边界

- 当前模型没有进行个体身高、训练水平或疼痛状态校准。
- 2D 姿态会受机位、光照、遮挡影响。
- 后续应使用真实样本校准阈值，并增加边界值测试。
