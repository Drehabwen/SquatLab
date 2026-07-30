# RehabScreenLab 文档索引

## 当前权威文档

以下文档共同定义“步态剪影一级分流 → 静态体态与人工 Adams 标准筛查 → 报告/复核/复测”的产品基线：

1. `PRD.md`：产品目标、用户、范围和两级筛查流程；
2. `SPEC.md`：V3 移动端页面、交互、状态、证据门控、失败恢复和验收规格；
3. `PROTOCOL_API_CONTRACT.md`：vNext 前后端协议与兼容迁移；
4. `REPORT_LOGIC.md`：证据、风险、报告条件和下一步动作；
5. `TECH_ROADMAP.md`：实施阶段和发布门槛。

如文档之间出现冲突，优先级为：

```text
SPEC
→ PRD
→ PROTOCOL_API_CONTRACT
→ REPORT_LOGIC
→ TECH_ROADMAP
```

## 已确认产品决策

- 手机端 Adams 只做动作引导、证据留存和人工结构化录入。
- 手机二维算法不得自动输出 Adams 严重度、ATR 或 Cobb 角。
- ATR 只接受经验证设备的测量值，并记录来源与操作者。
- 深蹲是可选动作控制证据，不是脊柱筛查必选项。
- 步态剪影只负责一级风险分诊，不能单独生成正式筛查报告。

## V3 视觉资产

- `../ui-design/high-fidelity-v3/DESIGN-SYSTEM.md`
- `../ui-design/high-fidelity-v3/screens/`

视觉资产定义界面观感，`SPEC.md` 定义行为与验收；两者冲突时，以 `SPEC.md` 的业务规则和医学边界为准。

## 历史归档

2026-07-29 更新前的主文档和打包镜像已完整复制到：

- `archive/2026-07-29-v2-baseline/`

归档文件只用于追溯，不作为新功能开发依据。

## Legacy 文档

旧 SquatLab V1 文档、软著材料、安装包和生成工具已统一归档至：

- `archive/legacy-squatlab-v1/`

这些文件只用于历史追溯。涉及产品边界、筛查流程、协议必选性和医疗措辞时，一律以当前 `SPEC.md` 为准。
