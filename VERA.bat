@echo off
title VERA local stack
cd /d "%~dp0"
echo ================================================
echo   VERA - starting the full stack
echo   (Postgres + migrations + Hardhat + Solana + web)
echo ================================================
echo.
npm run demo:stack
echo.
echo [VERA] Stack is running. Keep this window open;
echo closing it stops the web app and local chains.
pause >nul
