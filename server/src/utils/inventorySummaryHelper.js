const Inventory = require('../models/Inventory');
const ProductVariant = require('../models/ProductVariant');
const Product = require('../models/Product');
const ProductLocationSetting = require('../models/ProductLocationSetting');
const VariantLocationSetting = require('../models/VariantLocationSetting');

function variantFlag(qty, reorderLevel) {
  if (qty === 0) return 'out';
  if (reorderLevel > 0 && qty <= reorderLevel) return 'low';
  return null;
}

// Returns per-product totals + reorder status for ONE location.
// locationType: 'warehouse' | 'store', locationId: the id
async function getLocationProductSummary(locationType, locationId) {
  const invWhere = locationType === 'warehouse' ? { warehouse_id: locationId } : { store_id: locationId };

  const inventoryRows = await Inventory.findAll({
    where: invWhere,
    include: [{ model: ProductVariant, include: [Product] }],
  });

  const byProduct = {};
  for (const row of inventoryRows) {
    const pid = row.ProductVariant.product_id;
    if (!byProduct[pid]) {
      byProduct[pid] = {
        product_id: pid,
        product_name: row.ProductVariant.Product.product_name,
        total_quantity: 0,
        variants: [],
      };
    }
    byProduct[pid].total_quantity += row.quantity;
    byProduct[pid].variants.push({
      variant_id: row.variant_id, color: row.ProductVariant.color, size: row.ProductVariant.size,
      quantity: row.quantity,
    });
  }

  const settingWhere = locationType === 'warehouse' ? { warehouse_id: locationId } : { store_id: locationId };
  const settings = await ProductLocationSetting.findAll({ where: settingWhere });
  const reorderMap = {};
  settings.forEach((s) => { reorderMap[s.product_id] = s.reorder_level; });
  const variantSettings = await VariantLocationSetting.findAll({ where: settingWhere });
  const variantReorderMap = {};
  variantSettings.forEach((s) => { variantReorderMap[s.variant_id] = s.reorder_level; });

  return Object.values(byProduct).map((entry) => {
    const reorder_level = reorderMap[entry.product_id] ?? 0;
    const status = entry.total_quantity === 0 ? 'out' : entry.total_quantity <= reorder_level ? 'low' : 'ok';
    entry.variants.forEach((variant) => {
      variant.reorder_level = variantReorderMap[variant.variant_id] ?? 5;
      variant.flag = variantFlag(variant.quantity, variant.reorder_level);
    });
    return { ...entry, reorder_level, status, low_variants: entry.variants.filter((v) => v.flag) };
  });
}

module.exports = { getLocationProductSummary };
