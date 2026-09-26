@echo off
rem Purify for Windows, against THIS checkout of the website.
rem
rem Starts the website from this folder's production build on port 3000, opens
rem the desktop app pointed at it, and stops the website when the app closes.
rem It is how a release is walked on Windows before anything is deployed: the
rem window shows the branch, not purifyapp.net.
rem
rem   - Needs a production build (npm run build). If there is none, it makes one.
rem   - Needs the debug desktop app (in desktop\: npm run tauri build -- --debug).
rem     A release build always opens purifyapp.net and ignores the local site.
rem   - Discord status: put your Discord application ID (the long number on the
rem     Discord developer portal) alone in desktop\discord-client-id.txt.
rem     Without it the app runs and Settings says Discord is not set up.
rem
rem Port 3000 on purpose: capabilities\dev.json lets only localhost:3000 call
rem the app's four commands. See docs\DESKTOP.md.

setlocal EnableExtensions
if /i not "%~1"=="--here" (
  start "Purify test" /min "%ComSpec%" /c ""%~f0" --here"
  exit /b 0
)

set "DESKTOP_DIR=%~dp0"
for %%I in ("%DESKTOP_DIR%..") do set "REPO=%%~fI"
set "EXE=%DESKTOP_DIR%src-tauri\target\debug\purify-desktop.exe"
set "SITE=http://localhost:3000"
cd /d "%REPO%"

if not exist "%EXE%" (
  echo The desktop app has not been built. In the desktop folder run:
  echo     npm run tauri build -- --debug
  goto :fail
)

rem Already running from an earlier launch? Then use it.
call :alive
if not errorlevel 1 goto :open

rem Something else on port 3000 would take the app's window instead.
netstat -ano | findstr /r /c:":3000 .*LISTENING" >nul
if not errorlevel 1 (
  echo Port 3000 is busy with something that is not the Purify website.
  echo Close it, then run this again.
  goto :fail
)

if not exist ".next\BUILD_ID" (
  echo No production build yet. Building the website, this takes about 10 minutes...
  call npm run build
  if errorlevel 1 goto :fail
)

echo Starting the website on %SITE% ...
start "Purify website (port 3000)" /min "%ComSpec%" /c "npm run start -- --port 3000"
set /a TRIES=0
:wait
set /a TRIES+=1
if %TRIES% gtr 90 (
  echo The website did not start. Check the "Purify website" window.
  goto :fail
)
call :alive
if errorlevel 1 (
  timeout /t 1 /nobreak >nul
  goto :wait
)
set "STARTED=1"

:open
set "PURIFY_DESKTOP_URL=%SITE%"
set "PURIFY_DISCORD_CLIENT_ID="
if exist "%DESKTOP_DIR%discord-client-id.txt" (
  set /p PURIFY_DISCORD_CLIENT_ID=<"%DESKTOP_DIR%discord-client-id.txt"
)
echo Opening Purify...
"%EXE%"

rem The app closed. Stop the website if this launch started it.
if defined STARTED (
  for /f "tokens=5" %%P in ('netstat -ano ^| findstr /r /c:":3000 .*LISTENING"') do (
    taskkill /PID %%P /T /F >nul 2>&1
  )
)
exit /b 0

:alive
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 '%SITE%/robots.txt'; if ($r.Content -match 'Sitemap') { exit 0 } else { exit 1 } } catch { exit 1 }"
exit /b %errorlevel%

:fail
echo.
pause
exit /b 1
