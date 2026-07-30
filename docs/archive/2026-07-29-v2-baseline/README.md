# RehabScreenLab 文档索引

## V2 权威文档

以下文档共同定义“步态剪影一级分诊 → 静态体态与人工 Adams 标准筛查 → 报告/复核/复测”的产品基线：

1. `PRD.md`：产品目标、用户、范围和两级筛查流程；
2. `SPEC.md`：页面、状态、采集、质控、算法边界和验收规格；
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

## Legacy V1 文档

以下文档主要描述旧 SquatLab 深蹲产品或现有兼容接口，不作为 V2 产品范围依据：

- `API.md`
- `DESIGN_GUIDELINES.md`
- `AI_DEVELOPMENT_SOP.md`
- `SQUAT_SCORING_LOGIC.md`
- `SOFTCOPYRIGHT_PACKAGE.md`

旧文档仍可用于现有深蹲模块维护。涉及产品边界、筛查流程、协议必选性和医疗措辞时，以 V2 权威文档为准。
