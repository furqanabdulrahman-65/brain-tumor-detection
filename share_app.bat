@echo off
echo ===================================================
echo   NeuroScan AI - Public Access Generator
echo   (Powered by localhost.run)
echo ===================================================
echo.
echo This script will generate a PUBLIC URL for your local server.
echo Anyone with this URL can access your app from ANY device.
echo.
echo [!] IMPORTANT: 
echo 1. Keep this window OPEN. If you close it, the link stops working.
echo 2. Your local server (run_server.bat) MUST be running separately.
echo 3. If asked about "authenticity of host", type "yes" and press Enter.
echo.
echo Connecting to the internet...
echo.
ssh -o StrictHostKeyChecking=no -R 80:localhost:8004 nokey@localhost.run
pause
