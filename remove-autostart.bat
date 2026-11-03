@echo off
setlocal
title Remove App Auto-Start

set "SHORTCUT=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Attendance App.lnk"

if not exist "%SHORTCUT%" goto :none

del "%SHORTCUT%"
if exist "%SHORTCUT%" goto :failed

echo Auto-start removed. The app will no longer start when you sign in.
echo You can still start it any time with start-app.bat.
pause
exit /b 0

:none
echo Auto-start is not installed, so there is nothing to remove.
pause
exit /b 0

:failed
echo Could not remove the auto-start shortcut.
pause
exit /b 1
