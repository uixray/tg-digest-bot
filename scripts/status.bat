@echo off
chcp 65001 >nul
title Статус бота
cd /d "D:\Dev\Claude projects\tg-digest-bot"

echo ========================================
echo   Статус Digest Bot
echo ========================================
echo.

call npx pm2 list

echo.
pause
