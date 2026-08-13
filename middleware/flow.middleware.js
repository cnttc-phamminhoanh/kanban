const service = require("../services/auth.service");

async function flowAccessMiddleware(req, res, next) {
  try {
    const flow = req.params.flow || req.query.flow || req.body?.igm_dept;

    if (!flow) {
      return res.status(400).json({
        success: false,
        message: "Flow is required",
      });
    }

    const allowed = await service.canAccessFlow(req.user.id, flow);

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this flow",
      });
    }

    req.flow = flow;

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = flowAccessMiddleware;
