@echo off
chcp 65001 >nul
title Запуск бота
cd /d "D:\Dev\Claude projects\tg-digest-bot"

echo ========================================
echo   Запуск Digest Bot...
echo ========================================
echo.

call npx pm2 start ecosystem.config.js
call npx pm2 save

echo.
echo ✅ Бот запущен!
echo.
pause
