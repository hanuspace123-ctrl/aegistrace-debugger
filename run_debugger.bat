@echo off
title AegisTrace Visual Debugger Launcher
echo ===================================================
echo   AegisTrace: Autonomous Self-Healing Middleware
echo ===================================================
echo.
cd /d "%~dp0"

:: Check if node_modules exists, install if missing
if not exist "node_modules" (
    echo Installing required dependencies...
    call npm install
)

echo Starting local backend services and gateway...

:: Check if port 8000 is already in use
netstat -ano | findstr :8000 >nul
if %errorlevel% equ 0 (
    echo Server is already running on port 8000.
) else (
    start "" /b node server.js
    echo Waiting for microservices to initialize...
    timeout /t 2 >nul
)

echo Opening AegisTrace Dashboard in your web browser...
start "" "http://127.0.0.1:8000"
echo Done! AegisTrace is active.
exit
