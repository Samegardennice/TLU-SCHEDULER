@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Can cai Node.js 24 hoac moi hon de chay app.
  pause
  exit /b 1
)
echo Mo http://127.0.0.1:4317 trong trinh duyet. Giu cua so nay de app hoat dong.
node --use-system-ca server.mjs
pause
