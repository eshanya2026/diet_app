@echo off
REM Run Diet App - use in a terminal where Node/npm are installed
cd /d "%~dp0"

echo Installing server dependencies...
cd server
if not exist node_modules call npm install
if errorlevel 1 exit /b 1

echo Installing client dependencies...
cd ..\client
if not exist node_modules call npm install
if errorlevel 1 exit /b 1

echo.
echo Starting server at http://localhost:5000 (new window)...
start "Diet API" cmd /k "cd /d %~dp0server && npm start"

timeout /t 3 /nobreak >nul
echo Starting client at http://localhost:3000 ...
cd ..\client
npm run dev
