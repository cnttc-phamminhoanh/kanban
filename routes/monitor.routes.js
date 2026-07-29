const router = require('express').Router();
const controller = require('../controllers/monitor.controller');

// router.get('/flowStyleSMV', controller.getFlowStyleSMV);

// router.get('/flowStyleInfo', controller.getFlowStyleInfo);

// router.get('/flowStyleAccQty', controller.getFlowStyleAccQtyStartCompelete);

// router.get('/flowStyleOutput', controller.getFlowStyleOutput);

// router.get('/defects', controller.getDefects);

// router.get('/workerQty', controller.getWorkerQty);

router.get('/', controller.getMonitor);

router.get('/flowDashboard', controller.getFlowDashBoard);

module.exports = router;
