#!/bin/bash

# ========================================================
# 🧭 LONG VOYAGE (การเดินทางอันยาวนาน) — Linux / Termux / macOS Launcher
# ========================================================

echo "========================================================"
echo "   🧭 LONG VOYAGE (การเดินทางอันยาวนาน) — Launcher"
echo "========================================================"
echo ""

# 1. Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] ไม่พบ Node.js ในเครื่องของคุณ!"
    echo "กรุณาติดตั้ง Node.js ก่อนเริ่มใช้งาน:"
    echo "  - บน Termux (Android): pkg install nodejs"
    echo "  - บน Debian/Ubuntu: sudo apt install nodejs npm"
    echo "  - บน macOS: brew install node"
    echo ""
    exit 1
fi

# 2. Check and install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "[SETUP] ตรวจพบการใช้งานครั้งแรก กำลังติดตั้ง Dependencies (npm install)..."
    npm install
    if [ $? -ne 0 ]; then
      echo "[ERROR] การติดตั้ง Dependencies ล้มเหลว!"
      exit 1
    fi
    echo "[SETUP] ติดตั้ง Dependencies เรียบร้อยแล้ว!"
    echo ""
fi

# 3. Check environment file
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "[SETUP] สร้างไฟล์ .env เริ่มต้นให้เรียบร้อยแล้ว"
    fi
fi

echo "[START] กำลังเปิดเซิร์ฟเวอร์ Long Voyage..."
echo "[INFO] เข้าใช้งานผ่านเบราว์เซอร์ได้ที่: http://localhost:3000"
echo ""

# 4. Open default browser in background after 2 seconds based on OS
(
    sleep 2
    if command -v termux-open-url &> /dev/null; then
        termux-open-url http://localhost:3000
    elif command -v xdg-open &> /dev/null; then
        xdg-open http://localhost:3000
    elif command -v open &> /dev/null; then
        open http://localhost:3000
    fi
) &

# 5. Run Server
node server/index.js
