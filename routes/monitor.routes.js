const router = require('express').Router();
const controller = require('../controllers/monitor.controller');
const authMiddleware = require('../middleware/auth.middleware');
const flowAccessMiddleware = require('../middleware/flow.middleware');

router.get('/flows', authMiddleware, controller.getMonitorByUser);

router.get('/flowDashboard', authMiddleware, flowAccessMiddleware, controller.getFlowDashBoard);

router.get('/flowSemiFGoods', authMiddleware, flowAccessMiddleware, controller.getFlowSemiFGoods);

router.get('/flowPlan', authMiddleware, controller.getFlowPlan);

router.put('/flowPlan', authMiddleware, controller.updateFlowPlan);

module.exports = router;
