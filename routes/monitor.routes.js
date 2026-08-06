const router = require('express').Router();
const controller = require('../controllers/monitor.controller');

router.get('/', controller.getMonitor);

router.get('/flowDashboard', controller.getFlowDashBoard);

router.get('/flowSemiFGoods', controller.getFlowSemiFGoods);

router.get('/api/flowPlan', controller.getFlowPlan);

router.put('/api/flowPlan', controller.updateFlowPlan);

module.exports = router;
