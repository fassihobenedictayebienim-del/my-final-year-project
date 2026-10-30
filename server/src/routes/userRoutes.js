const express = require("express");
const router = express.Router();
const {
  listUsers,
  updateUser,
  resetUserPassword,
  deleteUser,
  reactivateUser,
} = require("../controllers/userController");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

router.use(authenticateToken, authorizeRoles("administrator"));

router.get("/", listUsers);
router.put("/:id", updateUser);
router.put("/:id/reset-password", resetUserPassword);
router.delete("/:id", deleteUser);
router.put("/:id/reactivate", reactivateUser);

module.exports = router;
