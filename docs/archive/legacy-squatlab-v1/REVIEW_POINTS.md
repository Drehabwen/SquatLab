# Review Points

## 1. Product Name

- External registration name: `AI深蹲动作评估与训练反馈系统 V1.0`
- Internal repo codename: `SquatLab`

Review whether you want to keep both names or unify them before implementation deepens.

## 2. Scope Boundary

Current source-of-truth docs assume:

- squat-only product in V1.0
- single-user local-first mode
- no account system in V1.0
- frontend owns capture flow and UI
- backend owns storage, rule orchestration, and report summary

Review whether this matches the version you want to build and eventually register.

## 3. Metric Set

Current V1.0 metric set is:

- `squat_count`
- `knee_sway_ratio`
- `knee_valgus_angle`
- `center_deviation_ratio`
- `left_right_symmetry`
- `linkage_smoothness`
- `squat_depth_ratio`

Review whether this set is enough, or whether one metric must be added before implementation starts.

## 4. Design Token Discipline

Current docs now treat `frontend/src/shared/config/design-tokens.json` as the only token source.

Review these visual assumptions:

- primary brand tone is teal
- amber is accent only
- neutral paper is the page base
- data blue is reserved for analytics and chart emphasis
- no purple-led branding
- no generic SaaS dashboard look

## 5. Constraint Review

Review whether these hard constraints should remain strict:

- no company-linked code reuse
- no medical diagnosis wording
- no rehab-platform drift
- no undocumented API-field drift
- no styling outside token mapping

## 6. Files To Inspect First

- `docs/PRD.md`
- `docs/SPEC.md`
- `docs/CONSTRAINTS.md`
- `docs/ARCHITECTURE.md`
- `frontend/src/shared/config/design-tokens.json`

## 7. Deferred On Purpose

- dependency installation
- frontend build verification
- backend runtime verification
- browser pose capture implementation
- squat state machine implementation
- PDF export
