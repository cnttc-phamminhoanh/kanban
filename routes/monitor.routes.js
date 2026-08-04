const router = require('express').Router();
const controller = require('../controllers/monitor.controller');

router.get('/', controller.getMonitor);

router.get('/flowDashboard', controller.getFlowDashBoard);

router.get('/semiFGoods', controller.getFlowSemiFGoods);

module.exports = router;
