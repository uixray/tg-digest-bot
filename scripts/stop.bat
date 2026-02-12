@echo off
chcp 65001 >nul
title Остановка бота
cd /d "D:\Dev\Claude projects\tg-digest-bot"

echo ========================================
echo   Остановка Digest Bot...
echo ========================================
echo.

call npx pm2 stop digest-bot
call npx pm2 save

echo.
echo ⛔ Бот остановлен.
echo.
pause
