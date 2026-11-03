@echo off
setlocal
title Install App Auto-Start

set "APP_BAT=%~dp0start-app.bat"
set "WORK_DIR=%~dp0"
set "SHORTCUT=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Attendance App.lnk"

if not exist "%APP_BAT%" goto :missing

rem Paths are read from the environment so spaces or quotes in them can't break the command.
rem WindowStyle 7 starts the server window minimized.
powershell -NoProfile -Command "$s = (New-Object -ComObject WScript.Shell).CreateShortcut($env:SHORTCUT); $s.TargetPath = $env:APP_BAT; $s.WorkingDirectory = $env:WORK_DIR; $s.WindowStyle = 7; $s.Description = 'Starts the app when you sign in'; $s.Save()"
if errorlevel 1 goto :failed
if not exist "%SHORTCUT%" goto :failed

echo.
echo Done. The app will now start and open in your browser each time you sign in.
echo.
echo Starting it now...
start "" /min "%APP_BAT%"
echo.
echo To stop it from starting automatically, run remove-autostart.bat.
echo If you move this folder, run this file again from the new location.
echo.
pause
exit /b 0

:missing
echo start-app.bat was not found. Keep this file in the project folder.
pause
exit /b 1

:failed
echo Could not create the auto-start shortcut.
pause
exit /b 1
