const monitorRepository = require("../repositories/monitor.repository");
const dashboardRepository = require("../repositories/dashboard.repository");
const semiFGoodsRepository = require("../repositories/semiFGoods.repository");
const flowPlanRepository = require("../repositories/flowPlan.repository");
const recipe = require("./recipe.service")


async function getMonitor() {
  const result = await monitorRepository.getMonitorData();

  return Promise.all(
    result.map(async data => {
      const {
        percent2,
        dailyTarget,
        poCount,
        total
      } = await recipe.recipeTarget(data.flow);

      return {
        ...data,
        percent2,
        dailyTarget,
        poCount,
        total
      };
    })
  );
}

async function getMonitorByUser(user) {
  return monitorRepository.getMonitorDataByUser(user);
}

async function getFlowStyleSMV(flow) {
  return dashboardRepository.getFlowStyleSMV(flow);
}

async function getFlowStyleInfo(flow) {
  return dashboardRepository.getFlowStyleInfo(flow);
}

async function getFlowStyleAccQtyStartCompelete(flow) {
  return dashboardRepository.getFlowStyleAccQtyStartCompelete(flow);
}

async function getFlowStyleOutput(flow) {
  return dashboardRepository.getFlowStyleOutput(flow);
}

async function getDefects(flow) {
  return dashboardRepository.getDefects(flow);
}

async function getWorkerQty(flow) {
  return dashboardRepository.getWorkerQty(flow);
}

async function getFlowSemiFGoods(flow) {
  return semiFGoodsRepository.getFlowSemiFGoods(flow);
}

async function getFlowPlan() {
  return dashboardRepository.getFlowPlan();
}

async function getFlowPlanByUser(user) {
  return flowPlanRepository.getFlowPlanByUser(user);
}

async function updateFlowPlan(data) {
  return flowPlanRepository.updateFlowPlan(data);
}

module.exports = {
  getMonitor,
  getMonitorByUser,
  getFlowStyleSMV,
  getFlowStyleInfo,
  getFlowStyleAccQtyStartCompelete,
  getFlowStyleOutput,
  getDefects,
  getWorkerQty,
  getFlowSemiFGoods,
  getFlowPlan,
  updateFlowPlan,
  getFlowPlanByUser,
};
