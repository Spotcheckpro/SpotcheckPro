@echo off
cd /d "%~dp0"
echo Building and starting SpotCheckPro...
docker compose build --no-cache
docker compose up -d
start "" "http://localhost:3000"
pause
