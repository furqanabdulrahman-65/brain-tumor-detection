@echo off
echo Requesting administrative privileges...
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Success: Administrative privileges confirmed.
) else (
    echo Failure: Current permissions inadequate.
    echo Please right-click this file and select "Run as administrator".
    pause
    exit /b 1
)

echo.
echo ==========================================
echo 1. Switching Network Profile to PRIVATE...
echo ==========================================
powershell -Command "Set-NetConnectionProfile -InterfaceIndex 6 -NetworkCategory Private"
if %errorLevel% == 0 (
    echo Success: Network set to Private.
) else (
    echo Warning: Could not set network to Private.
)

echo.
echo ==========================================
echo 2. Adding Firewall Rule for Port 8000...
echo ==========================================
powershell -Command "New-NetFirewallRule -DisplayName 'Allow Port 8000' -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow"

if %errorLevel% == 0 (
    echo Firewall rule added successfully!
) else (
    echo Failed to add firewall rule.
)
echo.
echo ==========================================
echo SETUP COMPLETE. TRY SCANNING QR CODE NOW.
echo ==========================================
pause
