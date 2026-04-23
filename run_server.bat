@echo off
cd backend
echo Starting NeuroScan AI Server...
.\venv\Scripts\python -m uvicorn main:app --host 127.0.0.1 --port 8004 --log-level info
pause
