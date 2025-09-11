const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
app.get("/", (req, res) => {
  res.send("<h1>SpotCheckPro Demo</h1><p>Demo login: demo@spotcheck.pro / Demo123!</p>");
});
app.listen(port, ()=> console.log("listening", port));
