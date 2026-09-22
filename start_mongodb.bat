@echo off
title MongoDB Server - Antasari Mart Local Database
echo ========================================================
echo    🍃 MONGODB SERVER LOKAL - ANTASARI MART
echo ========================================================
echo Database Path : C:\Users\nurmi\mongodb-data
echo Port          : 27017 (localhost)
echo ========================================================
echo.
"C:\Users\nurmi\mongodb\MongoDB\Server\8.3\bin\mongod.exe" --dbpath "C:\Users\nurmi\mongodb-data" --port 27017 --bind_ip 127.0.0.1
pause
