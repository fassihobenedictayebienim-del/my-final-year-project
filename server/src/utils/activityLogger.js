const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');

// actor can be: a Sequelize User instance (has .name), req.user (JWT payload,
// no name), or null for system events. Never throws — a logging failure
// should never break the actual business operation it's attached to.
async function logActivity(actor, action, details) {
  try {
    let user_id = null, user_name = null, user_role = null;
    if (actor) {
      user_id = actor.user_id || null;
      user_role = actor.role || null;
      user_name = actor.name || null;
      if (!user_name && user_id) {
        const user = await User.findByPk(user_id, { attributes: ['name'] });
        if (user) user_name = user.name;
      }
    }
    await ActivityLog.create({ user_id, user_name, user_role, action, details: details || null });
  } catch (error) {
    console.error('Failed to write activity log:', error.message);
  }
}

module.exports = logActivity;