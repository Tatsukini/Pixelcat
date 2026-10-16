@echo off
rem ============================================================
rem  ThreeBody - one-click launcher (Windows)
rem  Creates the venv and installs dependencies on first run,
rem  starts the FastAPI backend and opens the browser.
rem  Stop the server with Ctrl+C. Messages are ASCII on purpose
rem  so they render in any console code page.
rem ============================================================
setlocal

set "ROOT=%~dp0"
if exist "%ROOT%backend\python\run.py" goto :found
if exist "%ROOT%ThreeBody\backend\python\run.py" (
  set "ROOT=%ROOT%ThreeBody\"
  goto :found
)
echo [x] backend\python\run.py not found next to this script.
echo     Keep start.cmd in the project folder that holds backend\ and frontend\.
pause
exit /b 1

:found
set "BACKEND=%ROOT%backend\python"
set "VENV=%ROOT%.venv"
set "PY=%VENV%\Scripts\python.exe"

echo.
echo   ThreeBody launcher
echo   project : %ROOT%

rem ---- already serving? then just open the browser ----
netstat -an | findstr /c:":8000 " | findstr /c:"LISTENING" >nul 2>nul
if not errorlevel 1 (
  echo   server  : already listening on port 8000
  echo   url     : http://127.0.0.1:8000/
  start "" "http://127.0.0.1:8000/"
  exit /b 0
)

rem ---- locate or create the virtual environment ----
if exist "%PY%" goto :havevenv
echo   venv    : missing, creating %VENV%
where py >nul 2>nul
if errorlevel 1 (
  where python >nul 2>nul
  if errorlevel 1 (
    echo [x] No Python found. Install Python 3.10 or newer, then run this again.
    pause
    exit /b 1
  )
  python -m venv "%VENV%"
) else (
  py -3 -m venv "%VENV%"
)
if not exist "%PY%" (
  echo [x] Could not create the virtual environment.
  echo     Install Python 3.10+ and make sure it is on PATH.
  pause
  exit /b 1
)

:havevenv
rem ---- install dependencies only when something is missing ----
"%PY%" -c "import fastapi, uvicorn, websockets" >nul 2>nul
if errorlevel 1 (
  echo   deps    : installing from requirements.txt ...
  "%PY%" -m pip install --disable-pip-version-check -q -r "%BACKEND%\requirements.txt"
  if errorlevel 1 (
    echo [x] Dependency install failed - see the messages above.
    pause
    exit /b 1
  )
)

echo   python  : %PY%
echo   url     : http://127.0.0.1:8000/   - Ctrl+C stops the server
echo.

rem ---- open the browser once the server has had time to bind ----
rem ping, not timeout: timeout refuses to run when stdin is not a console.
start /min "" cmd /c "ping -n 4 127.0.0.1 >nul & start http://127.0.0.1:8000/"

cd /d "%BACKEND%"
"%PY%" run.py

echo.
echo   server stopped.
pause
