require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { CONNECT_T8_DB, CONNECT_BI_DB } = require("./config/sqlserver")
const { CONNECT_IG_DB } = require("./config/database")
const monitorRoute = require("./routes/monitor.routes");
const monitorPrivateRoute = require("./routes/monitorPrivate.route");
const authRoute = require("./routes/auth.routes");

const START_SERVER = () => {
  const PORT = process.env.PORT || 3000;
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/api/auth", authRoute);
  app.use("/api/monitor", monitorRoute)
  app.use("/api/monitor/private", monitorPrivateRoute);
  app.use(express.static(path.join(__dirname, "public")));

  // NOT LOGIN
  app.get("/production", (req, res) => {
    res.sendFile(path.join(__dirname, "public/ui/production/production-management.html"));
  });
  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public/ui/monitor/monitor.html"));
  });
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

  // REQUIRE LOGIN
  app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public/ui_require_login/login/login.html"));
  });
  app.get("/login/pms/monitor", (req, res) => {
    res.sendFile(path.join(__dirname, "public/ui_require_login/monitor/monitor.html"));
  });
  app.get("/login/pms/monitor/flowDashboard/:flow", (req, res) => {
    res.sendFile(path.join(__dirname, "public/ui_require_login/dashboard/v1/line-dashboard.html"));
  });
  app.get("/login/pms/monitor/flowDashboard/v2/:flow", (req, res) => {
    res.sendFile(path.join(__dirname, "public/ui_require_login/dashboard/v2/line-dashboard-v2.html"));
  });
  app.get("/login/pms/monitor/flowDashboard/v3/:flow", (req, res) => {
    res.sendFile(path.join(__dirname, "public/ui_require_login/dashboard/v3/line-dashboard-v3.html"));
  });
  app.get("/login/pms/monitor/flowDashboard/v4/:flow", (req, res) => {
    res.sendFile(path.join(__dirname, "public/ui_require_login/dashboard/v4/line-dashboard-v4.html"));
  });
  app.get("/login/pms/monitor/flowDashboard/v5/:flow", (req, res) => {
    res.sendFile(path.join(__dirname, "public/ui_require_login/dashboard/v5/line-dashboard-v5.html"));
  });
  app.get("/login/pms/monitor/flowDashboard/v6/:flow", (req, res) => {
    res.sendFile(path.join(__dirname, "public/ui_require_login/dashboard/v6/line-dashboard-v6.html"));
  });
  app.get("/login/pms/monitor/semiFGoods/:flow", (req, res) => {
    res.sendFile(path.join(__dirname, "public/ui_require_login/semi-f-goods/line-semi-f-goods.html"));
  });
  app.get("/login/pms/monitor/flowEfficiency", (req, res) => {
    res.sendFile(path.join(__dirname, "public/ui_require_login/efficiency/line-efficiency.html"));
  });
  app.get("/login/pms/monitor/flowPlan", (req, res) => {
    res.sendFile(path.join(__dirname, "public/ui_require_login/plan/line-plan.html"));
  });

  app.use((err, req, res, next) => {
    const status = err.status || 500;

    res.status(status).json({
      success: false,
      message: err.message || "Internal server error", ...(err.code && { code: err.code })
    });
  });

  app.listen(PORT, () => {
    console.log(`Server running at ${PORT}`);
  });
}

(async () => {
  try {
    await Promise.all([
      CONNECT_IG_DB(),
      CONNECT_T8_DB(),
      CONNECT_BI_DB(),
    ])

    START_SERVER()
  } catch (error) {
    console.error( "Database connection failed:", error );
    process.exit(1);
  }
})()
