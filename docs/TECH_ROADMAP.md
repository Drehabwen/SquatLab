# Technical Roadmap: SquatLab V1.0

## 1. 项目概览

| Item | Value |
| --- | --- |
| Project Name | SquatLab |
| Product | AI 深蹲动作评估与训练反馈 |
| Frontend | React 18 + TypeScript + Vite |
| Backend | FastAPI + SQLite |
| Current Status | V1 MVP baseline |

## 2. 当前架构

```text
frontend/
  src/features/home
  src/features/squat
  src/features/history
  src/features/settings
  src/shared

backend/
  app/api/routes
  app/core
  app/features/squat
  app/shared
  tests
```

后端分层保持为：

```text
Route -> Service -> Repository
```

## 3. 已实现能力

- React 页面流：主页、深蹲评估、历史记录、设置。
- 设计 token 与基础 UI 组件。
- FastAPI 健康检查、摄像头状态、帧分析、评估、历史和报告预览接口。
- SQLite 本地存储。
- 基于关键点的实时指标推导：深度、膝晃动、膝内扣、重心偏移、左右对称、联动平滑度。
- 基础评分和建议生成。
- 前端组件测试与后端 API 测试。

## 4. 当前风险

- 评分逻辑仍是 MVP 启发式模型，需要真实样本校准。
- 2D 摄像头输入受机位、光照、遮挡和身体朝向影响较大。
- 摄像头真实设备端到端验证不足。
- 报告当前为预览结构，尚未实现 PDF/打印导出。

## 5. 近期迭代顺序

1. 修复文案、编码、测试和仓库基线问题。
2. 强化采集质量门槛：缺失关键点、视角错误、身体未入框、光照不足。
3. 改进重复次数状态机：加入底部停留、最小幅度、节奏异常和误触发过滤。
4. 把评分阈值配置化，补充单元测试覆盖边界值。
5. 实现报告导出和历史趋势对比。

## 6. 验证命令

```powershell
cd frontend
npm run build
npm run test -- --run

cd ..\backend
python -m pytest
```

## 7. V2 方向

- 多次评估趋势图。
- 训练计划建议。
- 多动作扩展，但必须在深蹲流程稳定后再做。
- 可选的本地用户档案和数据导出。
