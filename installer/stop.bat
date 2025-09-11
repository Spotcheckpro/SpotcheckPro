@echo off
cd /d "%~dp0"
docker compose down -v
echo SpotCheckPro stopped.
pause
