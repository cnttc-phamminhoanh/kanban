const service = require("../services/monitor.service");

async function getFlowStyleSMV(req, res, next) {
  try {
    const data = await service.getFlowStyleSMV();

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function getFlowStyleInfo(req, res, next) {
  try {
    const data = await service.getFlowStyleInfo();

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function getFlowStyleAccQtyStartCompelete(req, res, next) {
  try {
    const data = await service.getFlowStyleAccQtyStartCompelete();

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function getFlowStyleOutput(req, res, next) {
  try {
    const data = await service.getFlowStyleOutput();

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function getDefects(req, res, next) {
  try {
    const data = await service.getDefects();

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function getWorkerQty(req, res, next) {
  try {
    const data = await service.getWorkerQty();

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function getMonitor(req, res, next) {
  try {
    const data = await service.getMonitor();

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function getFlowDashBoard(req, res, next) {
  try {
    const flow = req.query.flow;

    const [
      infoData,
      smvData,
      accQtyStartCompeleteData,
      outputData,
      defectsData,
      workersData,
    ] = await Promise.all([
      service.getFlowStyleInfo(flow),
      service.getFlowStyleSMV(flow),
      service.getFlowStyleAccQtyStartCompelete(flow),
      service.getFlowStyleOutput(flow),
      service.getDefects(flow),
      service.getWorkerQty(flow),
    ]);

    res.json({
      infoData,
      smvData,
      accQtyStartCompeleteData,
      outputData,
      defectsData,
      workersData,
    });
  } catch (err) {
    next(err);
  }
}

async function getFlowSemiFGoods(req, res, next) {
  try {
    const flow = req.query.flow;

    const data = await service.getFlowSemiFGoods(flow);

    console.log(data)

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function getFlowPlan(req, res, next) {
  try {
    const data = await service.getFlowPlan();

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function updateFlowPlan(req, res, next) {
  try {
    const { igm_dept, worker_at, break_time_fr, break_time_to } = req.body;

    await service.updateFlowPlan({
      igm_dept,
      worker_at,
      break_time_fr,
      break_time_to,
    });

    res.json({
      success: true,
      message: "Updated successfully",
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMonitor,
  getFlowStyleSMV,
  getFlowStyleInfo,
  getFlowStyleAccQtyStartCompelete,
  getFlowStyleOutput,
  getDefects,
  getWorkerQty,
  getFlowDashBoard,
  getFlowSemiFGoods,
  getFlowPlan,
  updateFlowPlan,
};
