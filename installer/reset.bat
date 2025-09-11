@echo off
cd /d "%~dp0"
docker compose down -v
docker image prune -af
docker volume prune -f
echo SpotCheckPro reset complete.
pause
