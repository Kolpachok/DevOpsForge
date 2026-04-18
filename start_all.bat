@echo off
REM Запуск backend
start "Backend" cmd /k "cd /d "%~dp0backend" && .venv\Scripts\activate && uvicorn main:app --host 0.0.0.0 --port 8000"

REM Запуск frontend
start "Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"