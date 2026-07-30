@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   软件著作权源代码文档生成器
echo   青跃智衡 — AI姿态与动作筛查系统 V2.0
echo ========================================
echo.

REM 检查 Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Python，请先安装 Python 3.8+
    echo 下载地址: https://www.python.org/downloads/
    pause
    exit /b 1
)

REM 检查并安装 python-docx
echo [检查] 正在确认 python-docx 库...
python -c "import docx" >nul 2>&1
if %errorlevel% neq 0 (
    echo [安装] 正在安装 python-docx...
    pip install python-docx
    if %errorlevel% neq 0 (
        echo [错误] python-docx 安装失败，请手动运行: pip install python-docx
        pause
        exit /b 1
    )
)

echo.
echo [运行] 正在生成源代码文档...
python generate_softcopyright.py

echo.
echo ========================================
echo 完成！请查看生成的 .docx 文件
echo ========================================
pause
