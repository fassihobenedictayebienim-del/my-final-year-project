const express = require("express");
const router = express.Router();
const {
  listProducts,
  getProduct,
  updateProduct,
} = require("../controllers/productController");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

router.use(authenticateToken);

router.get("/", listProducts);
router.get("/:id", getProduct);

router.put(
  "/:id",
  authorizeRoles("administrator", "warehouse_manager"),
  updateProduct,
);
module.exports = router;
