@echo off
title VERA Full Stack
cd /d "%~dp0"
echo ================================================
echo   VERA - Starting Full Stack
echo   (TigerDB + Hardhat EVM + Solana + Next.js)
echo ================================================
echo.
call npm run demo:stack
echo.
echo ================================================
echo   [VERA] Stack has stopped or exited.
echo   Press any key to close this terminal...
echo ================================================
pause
