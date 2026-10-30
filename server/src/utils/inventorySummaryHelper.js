const Inventory = require("../models/Inventory");
const Product = require("../models/Product");
const ProductLocationSetting = require("../models/ProductLocationSetting");

function productFlag(quantity, reorderLevel) {
  if (quantity === 0) return "out";
  if (reorderLevel > 0 && quantity <= reorderLevel) return "low";
  return null;
}

async function getLocationProductSummary(locationType, locationId) {
  const where =
    locationType === "warehouse"
      ? { warehouse_id: locationId }
      : { store_id: locationId };
  const settingWhere =
    locationType === "warehouse"
      ? { warehouse_id: locationId }
      : { store_id: locationId };
  const [rows, settings] = await Promise.all([
    Inventory.findAll({
      where,
      include: [Product],
      order: [["product_id", "ASC"]],
    }),
    ProductLocationSetting.findAll({ where: settingWhere }),
  ]);
  const reorderMap = Object.fromEntries(
    settings.map((s) => [s.product_id, s.reorder_level]),
  );
  return rows.map((row) => {
    const quantity = Number(row.quantity);
    const reorder_level = Number(reorderMap[row.product_id] ?? 0);
    return {
      product_id: row.product_id,
      product_name: row.Product.product_name,
      unit_price: row.Product.unit_price,
      total_quantity: quantity,
      reorder_level,
      status: productFlag(quantity, reorder_level) || "ok",
    };
  });
}

module.exports = { getLocationProductSummary, productFlag };
