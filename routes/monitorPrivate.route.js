const router = require('express').Router();
const controller = require('../controllers/monitor.controller');
const efficiencyController = require('../controllers/efficiency.controller');

router.get('/flows', controller.getMonitor);

router.get('/flowDashboard', controller.getFlowDashBoard);

router.get('/flowSemiFGoods', controller.getFlowSemiFGoods);

router.get('/flowPlan', controller.getFlowPlan);

router.put('/flowPlan', controller.updateFlowPlan);

router.get('/flowEfficiency', efficiencyController.getEfficiency)

module.exports = router;
