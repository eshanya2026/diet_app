@echo off
REM Install all dependencies: root, server, client
echo Installing root dependencies...
call npm install
if errorlevel 1 goto err

echo Installing server dependencies...
cd server
call npm install
if errorlevel 1 goto err
cd ..

echo Installing client dependencies...
cd client
call npm install
if errorlevel 1 goto err
cd ..

echo.
echo All dependencies installed successfully.
exit /b 0

:err
echo.
echo Install failed. Make sure Node.js and npm are installed and in PATH.
exit /b 1
