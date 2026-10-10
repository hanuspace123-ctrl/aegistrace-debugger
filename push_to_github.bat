@echo off
title Push AegisTrace to GitHub
echo ===================================================
echo   Pushing AegisTrace to GitHub Repository:
echo   https://github.com/hanuspace123-ctrl/aegistrace-debugger
echo ===================================================
echo.
cd /d "%~dp0"

echo Ensuring main branch and origin are set...
git branch -M main
git remote set-url origin https://github.com/hanuspace123-ctrl/aegistrace-debugger.git

echo.
echo Pushing code to GitHub...
echo (If a browser window appears, click 'Sign in with your browser')
echo.
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ===================================================
    echo   SUCCESS! Your code is now live on GitHub!
    echo   URL: https://github.com/hanuspace123-ctrl/aegistrace-debugger
    echo ===================================================
    echo.
    echo You can now go to Railway.app and select 'aegistrace-debugger' to deploy!
) else (
    echo.
    echo [ERROR] Push failed. Please check your GitHub credentials or internet connection.
)

echo.
pause
