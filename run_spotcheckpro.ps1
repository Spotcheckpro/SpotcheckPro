# run_spotcheckpro.ps1 - Start server and a demo agent, open browser
$Base = Join-Path $HOME "Desktop\SpotCheckPremium"
$Server = Join-Path $Base "server"
$Agent = Join-Path $Base "agent"
Write-Host "Starting server (will run in new window)..."
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$Server'; npm install; npm start"
Start-Sleep -Seconds 4
# Start a demo agent (student) in its own window
Write-Host "Starting demo agent (Student One) ..."
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$Agent'; python -m venv venv; .\venv\Scripts\activate; python -c 'import sys; print(\"Preparing venv\")'; pip install -r requirements.txt; python agent.py --student 'Student One' --server http://localhost:3001"
# Open the public pages
Start-Sleep -Seconds 2
$index = Join-Path $Base "public\index.html"
Start-Process $index
Start-Sleep -Seconds 1
$dash = "http://localhost:3001/dashboard"
Start-Process $dash
Write-Host "Demo started. Open the dashboard, log in with demo credentials (teacher@braintrain.com / Teach@123)."
