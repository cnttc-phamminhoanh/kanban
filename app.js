const express = require("express");
const cors = require("cors");
const path = require("path");
const { getPool } = require("./config/sqlserver");

const monitorRoute = require("./routes/monitor.routes");

const app = express();

app.use(cors());

app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

app.get("/pms/monitor/flowDashboard/:flow", (req, res) => {
  res.sendFile(path.join(__dirname, "public/line-dashboard.html"));
});


app.get("/pms/monitor/flowDashboard/v2/:flow", (req, res) => {
  res.sendFile(path.join(__dirname, "public/line-dashboard-v2.html"));
});

app.get("/pms/monitor/flowDashboard/v3/:flow", (req, res) => {
  res.sendFile(path.join(__dirname, "public/line-dashboard-v3.html"));
});

app.get("/pms/monitor/flowDashboard/v4/:flow", (req, res) => {
  res.sendFile(path.join(__dirname, "public/line-dashboard-v4.html"));
});

app.use("/pms/monitor", monitorRoute);

module.exports = app;
