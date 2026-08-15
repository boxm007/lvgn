@echo off
chcp 65001 > nul
title Long Voyage — Game Engine

echo ========================================================
echo   🧭 LONG VOYAGE (การเดินทางอันยาวนาน) — Launcher
echo ========================================================
echo.

:: 1. Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] ไม่พบ Node.js ในเครื่องของคุณ!
    echo กรุณาดาวน์โหลดและติดตั้ง Node.js จาก https://nodejs.org/ ก่อนเปิดใช้งาน
    echo.
    pause
    exit /b 1
)

:: 2. Check and install dependencies if needed
if not exist "node_modules\" (
    echo [SETUP] ตรวจพบการใช้งานครั้งแรก กำลังติดตั้ง Dependencies (npm install)...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] การติดตั้ง Dependencies ล้มเหลว!
        pause
        exit /b 1
    )
    echo [SETUP] ติดตั้ง Dependencies เรียบร้อยแล้ว!
    echo.
)

:: 3. Check environment file
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" > nul
        echo [SETUP] สร้างไฟล์ .env เริ่มต้นให้เรียบร้อยแล้ว
    )
)

echo [START] กำลังเปิดเซิร์ฟเวอร์ Long Voyage...
echo [INFO] เข้าใช้งานผ่านเบราว์เซอร์ได้ที่: http://localhost:3000
echo.

:: 4. Open default browser after 2 seconds in background
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"

:: 5. Run Server
node server/index.js

pause
