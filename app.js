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
  res.sendFile(path.join(__dirname, "public/ui/dashboard/v1/line-dashboard.html"));
});


app.get("/pms/monitor/flowDashboard/v2/:flow", (req, res) => {
  res.sendFile(path.join(__dirname, "public/ui/dashboard/v2/line-dashboard-v2.html"));
});

app.get("/pms/monitor/flowDashboard/v3/:flow", (req, res) => {
  res.sendFile(path.join(__dirname, "public/ui/dashboard/v3/line-dashboard-v3.html"));
});

app.get("/pms/monitor/flowDashboard/v4/:flow", (req, res) => {
  res.sendFile(path.join(__dirname, "public/ui/dashboard/v4/line-dashboard-v4.html"));
});

app.get("/pms/monitor/flowDashboard/v5/:flow", (req, res) => {
  res.sendFile(path.join(__dirname, "public/ui/dashboard/v5/line-dashboard-v5.html"));
});

app.get("/pms/monitor/flowDashboard/v6/:flow", (req, res) => {
  res.sendFile(path.join(__dirname, "public/ui/dashboard/v6/line-dashboard-v6.html"));
});

app.get("/pms/monitor/semiFGoods/:flow", (req, res) => {
  res.sendFile(path.join(__dirname, "public/ui/semi-f-goods/line-semi-f-goods.html"));
});

app.get("/pms/monitor/flowEfficiency", (req, res) => {
  res.sendFile(path.join(__dirname, "public/ui/efficiency/line-efficiency.html"));
});

app.get("/pms/monitor/flowPlan", (req, res) => {
  res.sendFile(path.join(__dirname, "public/ui/plan/line-plan.html"));
});

app.use("/pms/monitor", monitorRoute);

module.exports = app;
