@echo off
echo.
echo ==========================================================
echo   NEUROSCAN AI MOBILE ACCESS (HTTPS)
echo ==========================================================
echo.
echo Closing any previous instances...
taskkill /f /im ssh.exe >nul 2>&1
echo.
echo Opening secure tunnel (via Serveo)...
echo THIS WINDOW MUST REMAIN OPEN.
echo.
echo ----------------------------------------------------------
echo WAIT FOR A URL BELOW (e.g., https://something.serveo.net)
echo TYPE THAT URL INTO YOUR PHONE BROWSER.
echo ----------------------------------------------------------
echo.
ssh -o ServerAliveInterval=60 -R 80:127.0.0.1:8000 serveo.net
pause
