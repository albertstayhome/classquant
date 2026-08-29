@echo off
chcp 65001 >nul
title ClassQuant Hub - 手機連線測試伺服器
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
pause
