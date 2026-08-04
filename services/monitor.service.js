const repository = require("../repositories/monitor.repository");

async function getMonitor() {
  return repository.getMonitorData();
}

async function getFlowStyleSMV(flow) {
  return repository.getFlowStyleSMV(flow);
}

async function getFlowStyleInfo(flow) {
  return repository.getFlowStyleInfo(flow);
}

async function getFlowStyleAccQtyStartCompelete(flow) {
  return repository.getFlowStyleAccQtyStartCompelete(flow);
}

async function getFlowStyleOutput(flow) {
  return repository.getFlowStyleOutput(flow);
}

async function getDefects(flow) {
  return repository.getDefects(flow);
}

async function getWorkerQty(flow) {
  return repository.getWorkerQty(flow);
}

async function getFlowSemiFGoods(flow) {
  return repository.getFlowSemiFGoods(flow);
}

module.exports = {
  getMonitor,
  getFlowStyleSMV,
  getFlowStyleInfo,
  getFlowStyleAccQtyStartCompelete,
  getFlowStyleOutput,
  getDefects,
  getWorkerQty,
  getFlowSemiFGoods,
};
