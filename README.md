# 青跃智衡 - 早筛端（SquatLab）项目架构与目录说明

青跃智衡早筛端（SquatLab）是一个面向**深蹲动作现场筛查、脊柱侧弯筛查（Adams 前屈）以及跨协议综合姿势对称度评估**的高效现场早筛系统。该系统与康复师临床工作站（`Rehab-main`）实现了数据同步闭环。

---

## 🧭 项目核心目录地图

整个早筛项目（`早筛/`）划分为 **Vite-React 前端客户端**、**FastAPI 后端核心服务**、**Capacitor 原生 Android 容器** 以及 **软著与设计辅助资产** 四大板块。以下是项目的完整目录结构说明：

```text
早筛/
├── app-debug.apk                     # 📱 最终编译交付的原生 Android 安装包 (4.06 MB)
│
├── frontend/                          # 🎨 前端 React 客户端 (基于 TypeScript & Vite)
│   ├── android/                      # 🤖 Gradle 原生 Android 工程项目 (Capacitor 自动生成)
│   │   ├── app/                      # Android 主应用，含 Java 桥接与原生打包资源
│   │   │   └── build/outputs/apk/    # 编译输出目录，Debug APK 的源生成地址
│   │   ├── gradlew.bat               # Windows Gradle 编译包装器脚本
│   │   ├── local.properties          # SDK 路径配置文件 (指向 D:/DEV/toolchains/android-sdk)
│   │   └── gradle.properties         # 环境变量配置 (已配置中文路径绕过与 JDK 21 强制指向)
│   │
│   ├── src/                          # 前端业务核心源码
│   │   ├── features/                 # 核心业务特性切片 (按 Feature 划分目录)
│   │   │   ├── dashboard/            # 仪表盘
│   │   │   ├── squat/                # 深蹲采集 (实时接入 MediaPipe 动作估计)
│   │   │   ├── subjects/             # 受试者建档管理
│   │   │   ├── sessions/             # 筛查会话生命周期
│   │   │   └── reports/              # 📊 综合报告中心 (近期深度重构模块)
│   │   │       ├── components/       # 解耦后的高内聚、轻量级表现层卡片
│   │   │       │   ├── PsiRiskSection.tsx       # [NEW] PSI对称指数仪表盘、风险评估与三轴度 bars
│   │   │       │   ├── EvidenceSection.tsx      # [NEW] 跨协议证据链 (Static Posture / Adams / Squat)
│   │   │       │   ├── RecommendationsSection.tsx # [NEW] 针对性的行动及纠正性运动训练建议
│   │   │       │   └── AiAnalysisCard.tsx       # LLM 大模型智能临床分析与审核卡片
│   │   │       └── pages/
│   │   │           └── IntegratedReportPage.tsx # [Refactored] 瘦身后的页面状态与云同步协调器
│   │   │
│   │   ├── shared/                   # 全局共享模块
│   │   │   ├── components/ui/        # 表现层原子组件库 (PsiGauge, SeverityBars, SurfaceCard)
│   │   │   ├── api/client.ts         # REST API 客户端 (包含同步至康复师工作台网关)
│   │   │   └── types/api.ts          # TypeScript 强类型接口模型 (如 CrossProtocolEvidence)
│   │   │
│   │   ├── App.tsx                   # 路由导航壳
│   │   └── main.tsx                  # 渲染入口
│   │
│   ├── capacitor.config.ts           # 📱 Capacitor 原生移动端打包配置文件
│   ├── package.json                  # 前端依赖配置与构建脚本 (包含 `check` 静态检查)
│   └── tsconfig.json                 # TypeScript 编译配置项
│
├── backend/                           # ⚙️ 后端 FastAPI 算法与数据服务 (基于 Python)
│   ├── app/                          # 后端核心源码
│   │   ├── api/                      # 路由器 API 路由设计
│   │   ├── core/                     # 系统核心配置与数据库连接
│   │   ├── features/                 # 数据处理、报告生成逻辑与 MediaPipe 计算适配器
│   │   └── main.py                   # FastAPI 服务启动入口
│   │
│   ├── tests/                        # 单元测试与接口端到端测试用例
│   ├── pose_landmarker.task          # MediaPipe 姿态评估权重任务文件
│   └── pyproject.toml                # 后端 Python 包依赖描述
│
├── docs/                             # 📄 产品设计、评分公式算法以及迭代描述文档
├── ui-design/                        # 🎨 产品界面视觉设计规范与切图资产
├── 生成软著文档.bat                   # 📝 自动化软著代码与文档打包批处理脚本
└── generate_softcopyright.py         # 软著 PDF/TXT 生成工具链
```

---

## ⚡ 核心开发与运行工作流

### 1. 启动本地后端 API 服务
后端采用 FastAPI 框架，评估记录采用 SQLite 存储。
```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -e .
python run.py
```
* **默认后端端口**：`http://localhost:8010`

### 2. 运行前端 Web 开发调试
前端基于 Vite + React，运行于轻量热更新服务器中。
```powershell
cd frontend
npm install
npm run dev
```
* **默认网页端口**：`http://localhost:5174` (配置了 `localhost:8010` 反向代理，支持跨域)
* **同步到工作站**：完成筛查后推送到 `http://localhost:8000/api/integration/sync-screening`

---

## 📱 移动端 APK 打包与同步流水线

得益于集成的 **Capacitor** 移动端打包框架，您可以随时同步 Web 最新功能，并生成打包体积仅为 **4.06 MB** 的独立 APK 安装包！

### 步骤一：编译最新的前端 Web 产物
在前端修改完代码或 CSS 样式后，执行标准生产环境编译：
```powershell
cd frontend
npm run build
```
这将在 `frontend/dist` 目录下输出高度优化的极简静态资源包。

### 步骤二：同步资源到原生 Android 工程
通过 Capacitor 原生桥接器，将编译出的 Web 产物同步到 Android 工程的 Assets 资产中：
```powershell
npx cap sync
```

### 步骤三：利用 Gradle 编译出 APK 安装包
进入 `android` 目录，利用内置的 Gradle 包装器，一键编译出 debug 版 APK：
```powershell
cd android
.\gradlew.bat assembleDebug
```
* **生成 APK 目标地址**：`android/app/build/outputs/apk/debug/app-debug.apk`
* *注：我们已在 `gradle.properties` 中内置了 JDK 21 强制适配（`D:\DEV\toolchains\jdk-21.0.9`）及中文路径安全绕过。您也可以直接在 Android Studio 中打开 `frontend/android` 目录进行可视化编译与调试。*
