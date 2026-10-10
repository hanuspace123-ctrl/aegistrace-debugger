@echo off
title AegisTrace Public Live Tunnel
echo ===================================================
echo   AegisTrace: Live Public Web Tunnel Launcher
echo ===================================================
echo.
cd /d "%~dp0"

:: Check if server is already running on port 8000
netstat -ano | findstr :8000 >nul
if %errorlevel% neq 0 (
    echo Starting AegisTrace Microservices Backend on port 8000...
    start "" /b node server.js
    timeout /t 3 >nul
) else (
    echo AegisTrace backend is already running on port 8000.
)

echo.
echo Connecting to Public HTTPS Tunnel (serveo.net)...
echo Forwarding internet traffic directly to port 8000...
echo.
echo ===================================================
echo  COPY AND OPEN THE HTTPS URL SHOWN BELOW:
echo ===================================================
echo.
ssh -o StrictHostKeyChecking=no -R 80:127.0.0.1:8000 serveo.net
pause
