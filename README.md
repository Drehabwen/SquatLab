# RehabScreenLab · 青跃智衡康复早筛端

面向现场康复筛查的 Web 与 Android 应用，支持静态姿态对称性、深蹲动作和 Adams 前屈测试，并把跨协议证据整理为可复核的筛查报告。

> 本项目是筛查和康复工作流辅助工具，不是医疗诊断设备，不能替代医生判断或影像学诊断。

## 解决什么问题

传统现场筛查容易留下零散观察，难以复查、比较和进入后续康复流程。RehabScreenLab 将采集过程、计算指标、数据质量和报告证据放在同一条链路中：

```text
受试者建档
  → 标准化采集
  → 姿态 / Adams / 深蹲指标
  → 质量检查与风险提示
  → 跨协议报告
  → 康复工作台人工确认
```

## 当前能力

- 静态姿态对称性采集
- 深蹲动作评估与 MediaPipe 姿态估计
- Adams 前屈筛查记录
- 跨协议证据和综合报告
- 受试者、筛查会话与报告管理
- Web 运行及 Capacitor Android 打包
- 与 [QingYueRehabWorkbench](https://github.com/Drehabwen/QingYueRehabWorkbench) 的筛查数据同步

## 技术结构

```text
frontend/    React、TypeScript、Vite、Capacitor Android
backend/     FastAPI、MediaPipe、指标计算与数据 API
docs/        评分逻辑、产品设计与实施说明
ui-design/   界面设计资产
```

## 本地运行

### 后端

需要 Python 3.10 或更高版本。

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
python run.py
```

默认 API 地址：`http://localhost:8010`。

### 前端

```powershell
cd frontend
npm install
npm run dev
```

默认 Web 地址：`http://localhost:5174`。

### 开发检查

```powershell
cd frontend
npm run check
npm test -- --run
npm run build
```

```powershell
cd backend
pytest
ruff check .
```

## Android 构建

Android SDK 和 JDK 路径应由开发者在本机配置，不提交 `local.properties` 或任何绝对路径。

```powershell
cd frontend
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

构建后的 APK 位于 `frontend/android/app/build/outputs/apk/`。APK、ZIP、PDF 和软著导出物不进入源码仓库；需要分发时应上传至 GitHub Releases 或独立交付位置。

## 数据与医学边界

- 不提交受试者数据库、原始照片、视频或可识别个人身份的报告。
- 示例数据必须是合成数据，并明确标注。
- 报告应同时呈现数据质量、缺失项、证据来源和人工复核状态。
- 风险提示不能表述为诊断结果。
- 所有跨系统数据都应保留来源会话和受试者标识映射。

## 相关项目

- [QingYueRehabWorkbench](https://github.com/Drehabwen/QingYueRehabWorkbench)：筛查后的康复评估、报告与随访工作台
- [rehab-motion-lab](https://github.com/Drehabwen/rehab-motion-lab)：动作指标与筛查证据实验库

## 当前重点

1. 建立可复现的采集质量和指标验证基准。
2. 固化与 QingYueRehabWorkbench 的同步合同。
3. 将报告中的计算结果与原始证据对应起来。
4. 用真实筛查流程验证操作时长、重测一致性和人工复核体验。
