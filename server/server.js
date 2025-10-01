/**
 * SpotCheckPremium - server.js
 * Simple file-based backend for demo + optional OpenAI integration.
 *
 * Endpoints:
 *  - POST /api/add_school
 *  - GET  /api/list_schools
 *  - POST /api/add_student
 *  - GET  /api/list_students
 *  - POST /api/violation       (agents call this)
 *  - GET  /api/list_violations
 *  - GET  /api/daily_report    (use ?ai=true to request AI summary)
 *  - POST /api/load_demo
 *  - POST /api/login          (teacher demo login)
 */
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const { fetch } = require("undici");

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const SCHOOLS = path.join(DATA_DIR, "schools.json");
const STUDENTS = path.join(DATA_DIR, "students.json");
const VIOLS = path.join(DATA_DIR, "violations.json");

function read(file, def) {
  try { const s = fs.readFileSync(file, "utf8"); return s ? JSON.parse(s) : def; } catch(e){ return def; }
}
function write(file, obj) { fs.writeFileSync(file, JSON.stringify(obj, null, 2), "utf8"); }

if (!fs.existsSync(SCHOOLS)) write(SCHOOLS, [{ id:1, name:"Braintrain Homeschooling Tutor Center" }]);
if (!fs.existsSync(STUDENTS)) write(STUDENTS, []);
if (!fs.existsSync(VIOLS)) write(VIOLS, []);

let schools = read(SCHOOLS, []);
let students = read(STUDENTS, []);
let violations = read(VIOLS, []);

app.use(cors());
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "../public")));

// Simple teacher demo credentials (change for production)
const DEMO_TEACHER = { username: "teacher@braintrain.com", password: "Teach@123" };
const JWT_SECRET = process.env.JWT_SECRET || "spotcheck-secret-demo";

// Auth: teacher login (demo)
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (username === DEMO_TEACHER.username && password === DEMO_TEACHER.password) {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "8h" });
    return res.json({ token });
  }
  return res.status(401).json({ error: "Invalid credentials (demo)" });
});

// Schools
app.post("/api/add_school", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  const s = { id: (schools.length + 1), name };
  schools.push(s); write(SCHOOLS, schools);
  res.json(s);
});
app.get("/api/list_schools", (req, res) => res.json(schools));

// Students
app.post("/api/add_student", (req, res) => {
  const { name, schoolId } = req.body;
  if (!name || !schoolId) return res.status(400).json({ error: "name & schoolId required" });
  const st = { id: (students.length + 1), name, schoolId, lastStatus: "unknown", lastSeen: null };
  students.push(st); write(STUDENTS, students);
  res.json(st);
});
app.get("/api/list_students", (req, res) => res.json(students));

// Agents post violations
app.post("/api/violation", (req, res) => {
  const payload = req.body;
  if (!payload || !payload.studentName) return res.status(400).json({ error: "studentName required" });
  payload.receivedAt = new Date().toISOString();
  violations.push(payload); write(VIOLS, violations);
  const st = students.find(s => s.name === payload.studentName);
  if (st) { st.lastStatus = payload.type || "off-task"; st.lastSeen = payload.timestamp || payload.receivedAt; write(STUDENTS, students); }
  res.json({ status: "ok" });
});
app.get("/api/list_violations", (req, res) => res.json(violations));

// Daily report with optional AI summary
app.get("/api/daily_report", async (req, res) => {
  const today = new Date().toISOString().slice(0,10);
  const filtered = violations.filter(v => {
    if (!v.timestamp) return true;
    return v.timestamp.slice(0,10) === today;
  });
  const summary = {};
  filtered.forEach(v => {
    if (!summary[v.studentName]) summary[v.studentName] = [];
    summary[v.studentName].push(v);
  });
  const structured = { generatedAt: new Date().toISOString(), studentsCount: students.length, violationsByStudent: summary, count: filtered.length };

  const useAI = (req.query.ai === "true");
  const OPENAI_KEY = process.env.OPENAI_API_KEY || "";
  if (useAI && OPENAI_KEY) {
    try {
      let eventsText = "";
      Object.keys(summary).forEach(name => {
        eventsText += `\n${name} (${summary[name].length} events):\n`;
        summary[name].slice(0,20).forEach(e => {
          eventsText += ` - ${e.timestamp || e.receivedAt} | ${e.process || ""} | ${e.windowTitle || ""} | idle ${e.idleSeconds || 0}s\n`;
        });
      });
      const prompt = "You are an assistant that summarizes student off-task events for teachers. Provide an executive summary, recommendations, and a short parent message.\n\nEvents:\n" + eventsText;
      const body = {
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: "You are an educational assistant writing professional summaries." }, { role: "user", content: prompt }],
        temperature: 0.2
      };
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type":"application/json", "Authorization":"Bearer " + OPENAI_KEY },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      const aiText = data?.choices?.[0]?.message?.content || JSON.stringify(data);
      return res.json({ structured, ai: aiText });
    } catch (err) {
      return res.json({ structured, ai_error: err.toString() });
    }
  }
  return res.json({ structured, note: useAI ? "AI requested but OPENAI_API_KEY not set" : "AI not requested" });
});

// Demo data loader
app.post("/api/load_demo", (req, res) => {
  const demoSchools = [{ id:1, name:"Braintrain Homeschooling Tutor Center" }, { id:2, name:"Riverdale Academy" }];
  const demoStudents = [
    { id:1, name:"Student One", schoolId:1 }, { id:2, name:"Student Two", schoolId:1 },
    { id:3, name:"Student Three", schoolId:2 }
  ];
  const demoViolations = [
    { studentName:"Student One", process:"chrome.exe", windowTitle:"YouTube - Off Task", idleSeconds: 60, timestamp: new Date().toISOString() },
    { studentName:"Student Two", process:"discord.exe", windowTitle:"Discord - chat", idleSeconds: 30, timestamp: new Date().toISOString() }
  ];
  schools = demoSchools; students = demoStudents; violations = demoViolations;
  write(SCHOOLS, schools); write(STUDENTS, students); write(VIOLS, violations);
  res.json({ message: "Demo loaded", schools, students, violations });
});

// Serve landing / dashboard
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "../public/index.html")));
app.get("/dashboard", (req, res) => res.sendFile(path.join(__dirname, "../public/dashboard.html")));

// Start server
app.listen(PORT, () => {
  console.log("ðŸš€ SpotCheckPro running at http://localhost:" + PORT);
});
