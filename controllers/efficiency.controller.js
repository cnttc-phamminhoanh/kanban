const efficiencyService = require("../services/efficiency.service")

async function getEfficiency(req, res, next) {
  try {
    const { flow, date } = req.query;

    const data = await efficiencyService.getEfficiencyData(flow, date);

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getEfficiency,
};
