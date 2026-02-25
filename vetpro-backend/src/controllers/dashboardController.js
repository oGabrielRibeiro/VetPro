// Console replaced by logger
const dashboardService = require('../services/dashboardService');
const logger = require('../utils/logger');

async function getDashboard(req, res) {
  try {
    const data = await dashboardService.getDashboardData(req.user.id);
    res.json(data);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Nao foi possivel carregar o dashboard.' });
  }
}

async function getMonthlyData(req, res) {
  try {
    const { year } = req.query;

    const data = await dashboardService.getMonthlyConsultations(
      req.user.id,
      year,
    );

    res.json(data);
  } catch (error) {
    logger.error(error);
    res
      .status(500)
      .json({ error: 'Nao foi possivel carregar os dados mensais.' });
  }
}

module.exports = {
  getDashboard,
  getMonthlyData,
};
