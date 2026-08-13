const router = require('express').Router();
const controller = require('../controllers/monitor.controller');

router.get('/flows', controller.getMonitor);

router.get('/flowDashboard', controller.getFlowDashBoard);

router.get('/flowSemiFGoods', controller.getFlowSemiFGoods);

router.get('/flowPlan', controller.getFlowPlan);

router.put('/flowPlan', controller.updateFlowPlan);

module.exports = router;
