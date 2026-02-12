@echo off
chcp 65001 >nul
title Логи бота
cd /d "D:\Dev\Claude projects\tg-digest-bot"

echo ========================================
echo   Логи Digest Bot (Ctrl+C для выхода)
echo ========================================
echo.

call npx pm2 logs digest-bot --lines 50
