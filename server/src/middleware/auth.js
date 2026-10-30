const jwt = require("jsonwebtoken");
const User = require("../models/User");

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token." });
    }
    try {
      // Re-check the account so deactivation takes effect even for an existing JWT.
      const user = await User.findByPk(decoded.user_id);
      if (!user || !user.active)
        return res
          .status(403)
          .json({ message: "This account is no longer active." });
      req.user = { ...decoded, name: user.name, active: user.active };
      next();
    } catch (_error) {
      return res
        .status(500)
        .json({ message: "Unable to validate the account." });
    }
  });
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res
        .status(403)
        .json({
          message: "You do not have permission to perform this action.",
        });
    }
    next();
  };
}

module.exports = { authenticateToken, authorizeRoles };
