const express = require("express");
const router = express.Router();
const {
  listLocations,
  updateWarehouse,
  updateStore,
  removeStore,
  reactivateStore,
} = require("../controllers/locationController");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

router.use(authenticateToken, authorizeRoles("administrator"));

router.get("/", listLocations);
router.put("/warehouses/:id", updateWarehouse);
router.put("/stores/:id", updateStore);
router.delete("/stores/:id", removeStore);
router.put("/stores/:id/reactivate", reactivateStore);

module.exports = router;
