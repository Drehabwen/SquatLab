# Software Copyright Package Plan

## 1. Recommended Registration Name

`AI深蹲动作评估与训练反馈系统 V1.0`

## 2. Recommended Short Product Name

`SquatLab`

## 3. Product Summary

本软件通过摄像头采集人体深蹲动作数据，对深蹲过程中的深度、稳定性、左右对称性和常见代偿风险进行结构化评估，并生成训练反馈和历史记录，用于个人训练辅助和动作质量管理。

## 4. Application Package Mapping

### Source Program

Priority extraction order:

1. backend core config and error handling
2. backend squat schemas, service, repository, and routes
3. frontend squat page, API client, environment config, and result display
4. shared types and layout files

Avoid extracting:

- `node_modules`
- generated build output
- virtual environments
- logs
- vendor code

### Supporting Document

Recommended chapters:

1. 软件概述
2. 运行环境
3. 系统架构
4. 功能模块
5. 操作流程
6. 结果展示
7. 数据记录与报告
8. 异常处理说明

## 5. Screenshot List

- 首页
- 深蹲评估页
- 实时反馈区域
- 结果页
- 历史记录页
- 设置页

## 6. Code Volume Target

- effective self-authored code files: 80 to 120
- effective self-authored code lines: 8000 to 12000

## 7. Clean-Room Rules

- do not copy company code into this repo
- do not reuse company product names or screenshots
- rewrite logic and text from first principles
- keep design docs and source history inside this repo only
