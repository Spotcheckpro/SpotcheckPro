SpotCheckPremium - Demo bundle
==============================

Folders:
- server/    -> Node.js server
- public/    -> Landing + dashboard HTML
- agent/     -> Python agent for students

Quick local run:
1) Open PowerShell
2) cd $HOME\Desktop\SpotCheckPremium
3) Run: powershell -ExecutionPolicy Bypass -File .\run_spotcheckpro.ps1
   (This will npm install and start server, create a venv for agent and run one demo agent.)

Notes:
- Dashboard URL: http://localhost:3001/dashboard
- Demo teacher login:
    username: teacher@braintrain.com
    password: Teach@123

Set OpenAI key (optional for AI summary):
$env:OPENAI_API_KEY = "sk-xxx"

To package for Render:
- Push repository to GitHub and connect to Render
- Render will run the commands in render.yaml

