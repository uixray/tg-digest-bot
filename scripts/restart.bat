@echo off
chcp 65001 >nul
title Перезапуск бота
cd /d "D:\Dev\Claude projects\tg-digest-bot"

echo ========================================
echo   Перезапуск Digest Bot...
echo ========================================
echo.

call npx pm2 restart digest-bot
call npx pm2 save

echo.
echo 🔄 Бот перезапущен!
echo.
pause
