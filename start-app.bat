@echo off
setlocal
title Attendance App Server
cd /d "%~dp0"

set "APP_URL=http://localhost:3000"

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install it from https://nodejs.org and try again.
  pause
  exit /b 1
)

if not exist ".env.local" (
  echo Missing .env.local. See "Getting Started" in README.md.
  pause
  exit /b 1
)

rem Already running: just open the browser instead of starting a second server.
curl -s -f -o nul "%APP_URL%/login" >nul 2>nul
if not errorlevel 1 (
  start "" "%APP_URL%"
  exit /b 0
)

if not exist "node_modules\" (
  echo Installing dependencies, this only happens once...
  call npm install
  if errorlevel 1 (
    echo Installing dependencies failed.
    pause
    exit /b 1
  )
)

rem Opens the browser as soon as the server answers, for up to 2 minutes.
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "for ($i = 0; $i -lt 120; $i++) { curl.exe -s -f -o NUL '%APP_URL%/login'; if ($LASTEXITCODE -eq 0) { Start-Process '%APP_URL%'; break }; Start-Sleep -Seconds 1 }"

echo.
echo Starting the app at %APP_URL%
echo Your browser will open when it is ready.
echo Keep this window open while using the app. Close it to stop the app.
echo.

call npm run dev -- -H localhost -p 3000

echo.
echo The app has stopped.
pause
