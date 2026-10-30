const ActivityLog = require("../models/ActivityLog");

// GET /api/activity-logs — Administrator only
async function listActivityLogs(req, res) {
  try {
    const logs = await ActivityLog.findAll({
      order: [["created_at", "DESC"]],
      limit: 200,
    });
    // Older entries may predate the removal of user-facing shipment references.
    // Keep the audit event but never surface the former internal batch number.
    res.json({
      logs: logs.map((log) => {
        const item = log.toJSON();
        if (item.action === "SHIPMENT_BATCH_RECORDED") {
          item.action = "SHIPMENT_RECEIVED";
          item.details = "Shipment received into warehouse stock.";
        }
        return item;
      }),
    });
  } catch (error) {
    console.error("List activity logs error:", error);
    res
      .status(500)
      .json({ message: "Something went wrong while fetching activity logs." });
  }
}

module.exports = { listActivityLogs };
