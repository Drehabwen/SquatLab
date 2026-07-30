# Technical Roadmap: RehabScreenLab V2.0

## 1. 项目概览

| Item | Value |
| --- | --- |
| Project | RehabScreenLab |
| Product | 青少年姿态与脊柱风险筛查闭环 |
| Frontend | React + TypeScript + Vite + Capacitor |
| Backend | FastAPI + SQLite |
| Current baseline | 静态体态 + Adams 算法草案 + 深蹲 + 综合报告 |
| V2 target | 步态剪影一级分诊 + 人工 Adams 标准筛查 + 复核/报告/复测 |

## 2. 目标架构

```text
Mobile Capture
  ├─ gait silhouette capture + automatic quality gate
  ├─ static posture capture
  ├─ Adams evidence capture + observer form
  └─ optional squat capture

Screening Service
  ├─ workflow state machine
  ├─ protocol result normalization
  ├─ data completeness / formal report conditions
  ├─ cross-protocol evidence rules
  └─ review and retest routing

Model Runtime
  ├─ silhouette segmentation
  ├─ interpretable geometric features
  ├─ calibrated lightweight classifier
  └─ uncertainty / OOD checks

Persistence
  ├─ subjects
  ├─ screening_sessions
  ├─ protocol_results
  ├─ observer_records / device_measurements
  ├─ integrated_reports
  └─ review_actions / retest_tasks
```

## 3. 当前差距

- PRD/SPEC 已转向 V2，代码仍使用旧三协议默认流程。
- 手机端 Adams 当前包含自动派生指标，不满足新的人工记录边界。
- 深蹲仍可能被旧规则视为默认联合筛查协议。
- `gait_silhouette` 尚未进入 schema、路由、页面和数据库。
- 采集质量仍有人工选择入口，自动质控不足。
- 报告尚未区分初筛摘要与正式报告。
- 新工作流状态、报告条件、复核和复测任务尚未实现。
- 剪影研究仍缺少官方受试者映射和本地前瞻性验证。

## 4. 实施阶段

### Phase 0：文档与安全边界

目标：

- 统一产品、协议、报告和技术口径；
- 明确筛查非诊断；
- 明确 Adams 人工记录、深蹲可选。

完成条件：

- PRD、SPEC、API Contract、Report Logic、Roadmap 一致；
- 无“三协议人人必做”和“手机自动 ATR”表述。

### Phase 1：规则与工作流迁移

实施：

- 新增 V2 `ScreeningStatus`；
- 新增 `ScreeningMode` 与 `ProtocolRole`；
- 深蹲调整为 `optional_support`；
- Adams 增加 `observer_records` 和 `device_measurements`；
- 增加 `DataCompleteness` 和 `FormalReportConditions`；
- 区分初筛摘要与正式报告；
- 保留旧会话兼容映射。

验证：

- 状态转换单元测试；
- 深蹲缺失不阻塞正式报告；
- Adams 人工记录缺失时报告被阻塞；
- 旧会话仍可读取。

### Phase 2：采集质量自动化

实施：

- 移除将 `poor` 人工强制改为 `good` 的路径；
- 建立通用质量检查结构；
- 静态和 Adams 增加入框、遮挡、动作完成检查；
- 增加阻塞原因和可执行复采提示。

验证：

- 每种失败都映射到唯一阻塞原因；
- 质量失败不产生风险结论；
- 复采后可回到原任务。

### Phase 3：步态剪影采集 MVP

实施：

- 新增 `gait_silhouette` 协议；
- 5–8 秒短步行采集；
- 剪影分割和临时视频处理；
- 24 段左右轮廓均值；
- 镜像与方向规范化；
- 原始 RGB 默认即时删除。

第一版模型候选：

```text
48维左右边缘均值
→ train-only 标准化
→ L2 逻辑回归
→ 校准分诊分数
```

不得上线：

- 最低分段二特征模型；
- 固定论文 8 特征模型；
- 未经验证的单张静态照片模型；
- 自动 Cobb 角或诊断输出。

### Phase 4：两级产品流程

实施：

- 一级初筛任务和摘要；
- 风险/不确定触发标准筛查；
- 人工 Adams 录入；
- 正式报告条件；
- 复核队列；
- 复测任务和历史比较。

验证主链：

```text
overview
→ task queue
→ student processing hub
→ initial triage
→ standard screening
→ formal report
→ retest
```

### Phase 5：科学验证

必须完成：

- 获取官方受试者映射或独立队列；
- 受试者独立训练/验证/测试；
- 本地目标年龄、性别和设备验证；
- 镜像、平移、尺度、衣物、遮挡、光照和机位实验；
- 模型校准与分布外评估；
- 初筛阈值的敏感度/特异度权衡；
- 前瞻性现场验证；
- 人工 Adams 观察者间一致性评估。

在 Phase 5 完成前：

- 仅允许研究或内部试点标识；
- 不宣称临床性能；
- 不将模型分数称为患病概率。

### Phase 6：发布与治理

实施：

- 模型版本与回滚；
- 审核日志；
- 数据保留和授权策略；
- 报告模板锁定；
- 阈值变更审批；
- 数据集许可与商业用途确认。

## 5. 优先级

### P0

- Adams 改成人工结构化记录。
- 深蹲解除必选。
- 正式报告条件。
- 新状态机和兼容映射。

### P1

- 自动质控。
- 步态剪影采集与隐私处理。
- 轻量全身轮廓模型。

### P2

- 组织级任务队列。
- 复核和复测闭环。
- 多设备鲁棒性。

### P3

- 可选动作控制扩展。
- 趋势和组织统计。
- 经验证后的模型升级。

## 6. 验证命令

```powershell
cd frontend
npm run check
npm run test -- --run
npm run build

cd ..\backend
python -m pytest
```

文档验证：

```powershell
rg -n "AI诊断|自动ATR|Cobb角预测|三个协议均无|三类协议职责" docs
git diff --check
```

## 7. 发布门槛

- 必需协议和可选协议边界有测试。
- 手机端不会自动输出 Adams 严重度或 ATR。
- 深蹲缺失不阻塞正式报告。
- 初筛摘要不能伪装为正式报告。
- 所有质量失败进入复采。
- 所有分布外和证据冲突进入复核。
- 报告包含证据来源、模型版本和免责声明。
- 科学验证与数据许可满足实际发布场景要求。
