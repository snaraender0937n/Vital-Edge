@echo off
echo ================================================================
echo           VITALEDGE SOLDIER HEALTH TELEMETRY SYSTEM
echo ================================================================
echo Starting FastAPI Telemetry Engine and React Tactical Dashboard...
echo.

REM Start FastAPI Backend
start "VitalEdge Backend (COM9 / UDP:5005)" cmd /k "cd /d %~dp0backend && .\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000"

REM Start Vite Frontend
start "VitalEdge Dashboard (http://localhost:5173)" cmd /k "cd /d %~dp0frontend && npx vite --port 5173"

echo Services launched!
echo - Frontend: http://localhost:5173
echo - Backend:  http://localhost:8000
echo - Hardware Serial Port: COM9 @ 115200 baud
echo - Hardware UDP Port:    5005
echo.
pause
