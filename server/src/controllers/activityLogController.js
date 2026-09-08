const ActivityLog = require('../models/ActivityLog');

// GET /api/activity-logs — Administrator only
async function listActivityLogs(req, res) {
  try {
    const logs = await ActivityLog.findAll({
      order: [['created_at', 'DESC']],
      limit: 200,
    });
    res.json({ logs });
  } catch (error) {
    console.error('List activity logs error:', error);
    res.status(500).json({ message: 'Something went wrong while fetching activity logs.' });
  }
}

module.exports = { listActivityLogs };