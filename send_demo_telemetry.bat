@echo off
echo ================================================================
echo           VITALEDGE TELEMETRY INJECTOR / HARDWARE SIMULATOR
echo ================================================================
echo This tool injects structured hardware telemetry over UDP port 5005
echo to test the live dashboard when LilyGO is disconnected.
echo.
echo Select Mode:
echo [1] Healthy Soldier Vitals (HR: 72, SpO2: 98%%, Temp: 36.6C, Risk: NORMAL)
echo [2] Elevated Stress Vitals (HR: 135, SpO2: 92%%, Temp: 38.4C, Risk: HIGH)
echo [3] Emergency SOS Distress Beacon
echo.
set /p opt="Enter selection [1-3]: "

if "%opt%"=="1" (
    .\backend\venv\Scripts\python.exe tools\hardware_sender_cli.py --mode healthy --rate 2.0
) else if "%opt%"=="2" (
    .\backend\venv\Scripts\python.exe tools\hardware_sender_cli.py --mode stress --rate 2.0
) else if "%opt%"=="3" (
    .\backend\venv\Scripts\python.exe tools\hardware_sender_cli.py --mode stress --sos --rate 2.0
) else (
    .\backend\venv\Scripts\python.exe tools\hardware_sender_cli.py --mode healthy --rate 2.0
)

pause
