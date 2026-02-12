@echo off
chcp 65001 >nul
title Сборка и перезапуск бота
cd /d "D:\Dev\Claude projects\tg-digest-bot"

echo ========================================
echo   Сборка и перезапуск Digest Bot
echo ========================================
echo.

echo [1/3] Компиляция TypeScript...
call npx tsc
if %errorlevel% neq 0 (
    echo.
    echo ❌ Ошибка компиляции! Перезапуск отменён.
    echo.
    pause
    exit /b 1
)

echo [2/3] Перезапуск бота...
call npx pm2 restart digest-bot

echo [3/3] Сохранение состояния...
call npx pm2 save

echo.
echo ✅ Бот пересобран и перезапущен!
echo.
pause
