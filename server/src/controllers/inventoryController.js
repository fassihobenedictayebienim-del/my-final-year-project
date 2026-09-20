const { Op } = require('sequelize');
const Inventory = require('../models/Inventory');
const ProductVariant = require('../models/ProductVariant');
const Product = require('../models/Product');
const ProductLocationSetting = require('../models/ProductLocationSetting');
const VariantLocationSetting = require('../models/VariantLocationSetting');

// GET /api/inventory — variant-level detail, filtered to the user's own location
async function listInventory(req, res) {
  try {
    const where = {};
    if (req.user.role === 'warehouse_manager') where.warehouse_id = req.user.warehouse_id;
    else if (req.user.role === 'store_manager') where.store_id = req.user.store_id;

    const inventory = await Inventory.findAll({
      where,
      include: [{ model: ProductVariant, include: [Product] }],
      order: [['variant_id', 'ASC']],
    });
    res.json({ inventory });
  } catch (error) {
    console.error('List inventory error:', error);
    res.status(500).json({ message: 'Something went wrong while fetching inventory.' });
  }
}

// GET /api/inventory/warehouse-stock — variant-level warehouse stock,
// visible to any role (Store Managers need this to pick an exact variant to request)
async function getWarehouseStock(req, res) {
  try {
    const inventory = await Inventory.findAll({
      where: { warehouse_id: { [Op.ne]: null } },
      include: [{ model: ProductVariant, include: [Product] }],
      order: [['variant_id', 'ASC']],
    });
    res.json({ inventory });
  } catch (error) {
    console.error('Warehouse stock error:', error);
    res.status(500).json({ message: 'Something went wrong while fetching warehouse stock.' });
  }
}

function buildVariantFlag(qty, reorderLevel) {
  if (qty === 0) return 'out';
  if (reorderLevel > 0 && qty <= reorderLevel) return 'low';
  return null;
}

// GET /api/inventory/summary — product-level totals at the user's own
// location(s), compared against that location's reorder level, plus a
// breakdown of which individual variants are low/out.
// Administrator gets this broken out per location instead of a single one.
async function getInventorySummary(req, res) {
  try {
    const locations = [];
    if (req.user.role === 'warehouse_manager') {
      locations.push({ type: 'warehouse', id: req.user.warehouse_id, label: 'Warehouse' });
    } else if (req.user.role === 'store_manager') {
      locations.push({ type: 'store', id: req.user.store_id, label: `Store ${req.user.store_id}` });
    } else {
      // administrator — all locations
      const Warehouse = require('../models/Warehouse');
      const Store = require('../models/Store');
      const warehouses = await Warehouse.findAll();
      const stores = await Store.findAll();
      warehouses.forEach((w) => locations.push({ type: 'warehouse', id: w.warehouse_id, label: w.name }));
      stores.forEach((s) => locations.push({ type: 'store', id: s.store_id, label: s.name }));
    }

    const summary = [];

    for (const loc of locations) {
      const invWhere = loc.type === 'warehouse' ? { warehouse_id: loc.id } : { store_id: loc.id };
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
            unit_price: row.ProductVariant.Product.unit_price,
            total_quantity: 0,
            variants: [],
          };
        }
        byProduct[pid].total_quantity += row.quantity;
        byProduct[pid].variants.push({
          variant_id: row.variant_id, color: row.ProductVariant.color, size: row.ProductVariant.size,
          unit_price: row.ProductVariant.Product.unit_price,
          quantity: row.quantity,
        });
      }

      const settingWhere = loc.type === 'warehouse' ? { warehouse_id: loc.id } : { store_id: loc.id };
      const settings = await ProductLocationSetting.findAll({ where: settingWhere });
      const reorderMap = {};
      settings.forEach((s) => { reorderMap[s.product_id] = s.reorder_level; });
      const variantSettings = await VariantLocationSetting.findAll({ where: settingWhere });
      const variantReorderMap = {};
      variantSettings.forEach((s) => { variantReorderMap[s.variant_id] = s.reorder_level; });

      for (const pid of Object.keys(byProduct)) {
        const entry = byProduct[pid];
        entry.reorder_level = reorderMap[pid] ?? 0;
        entry.status = entry.total_quantity === 0 ? 'out' : entry.total_quantity <= entry.reorder_level ? 'low' : 'ok';
        entry.variants.forEach((variant) => {
          variant.reorder_level = variantReorderMap[variant.variant_id] ?? 5;
          variant.flag = buildVariantFlag(variant.quantity, variant.reorder_level);
        });
        entry.low_variants = entry.variants.filter((v) => v.flag);
        summary.push({ location_type: loc.type, location_id: loc.id, location_label: loc.label, ...entry });
      }
    }

    res.json({ summary });
  } catch (error) {
    console.error('Inventory summary error:', error);
    res.status(500).json({ message: 'Something went wrong while building the inventory summary.' });
  }
}

// GET /api/inventory/low-stock — Warehouse Manager and Administrator:
// products whose warehouse total is at/below the warehouse's reorder level
async function lowStockAlerts(req, res) {
  try {
    const warehouse_id = req.user.role === 'warehouse_manager' ? req.user.warehouse_id : null;
    const invWhere = warehouse_id ? { warehouse_id } : { warehouse_id: { [Op.ne]: null } };

    const inventoryRows = await Inventory.findAll({
      where: invWhere,
      include: [{ model: ProductVariant, include: [Product] }],
    });

    const byProduct = {};
    for (const row of inventoryRows) {
      const key = `${row.ProductVariant.product_id}__${row.warehouse_id}`;
      if (!byProduct[key]) {
        byProduct[key] = { product_id: row.ProductVariant.product_id, product_name: row.ProductVariant.Product.product_name, warehouse_id: row.warehouse_id, total: 0 };
      }
      byProduct[key].total += row.quantity;
    }

    const settings = await ProductLocationSetting.findAll({ where: warehouse_id ? { warehouse_id } : { warehouse_id: { [Op.ne]: null } } });
    const reorderMap = {};
    settings.forEach((s) => { reorderMap[`${s.product_id}__${s.warehouse_id}`] = s.reorder_level; });

    const lowStock = Object.values(byProduct)
      .map((p) => ({ ...p, reorder_level: reorderMap[`${p.product_id}__${p.warehouse_id}`] ?? 0 }))
      .filter((p) => p.total <= p.reorder_level);

    res.json({ low_stock: lowStock });
  } catch (error) {
    console.error('Low stock alert error:', error);
    res.status(500).json({ message: 'Something went wrong while checking low-stock levels.' });
  }
}

// GET /api/inventory/reorder-level/:productId — get current user's location's reorder level for a product
async function getReorderLevel(req, res) {
  try {
    const { productId } = req.params;
    const where = { product_id: productId };
    if (req.user.role === 'warehouse_manager') where.warehouse_id = req.user.warehouse_id;
    else if (req.user.role === 'store_manager') where.store_id = req.user.store_id;
    else return res.status(400).json({ message: 'This endpoint is for Warehouse or Store Managers only.' });

    const setting = await ProductLocationSetting.findOne({ where });
    res.json({ reorder_level: setting ? setting.reorder_level : 0 });
  } catch (error) {
    console.error('Get reorder level error:', error);
    res.status(500).json({ message: 'Something went wrong while fetching the reorder level.' });
  }
}

// PUT /api/inventory/reorder-level/:productId — set current user's location's reorder level
async function setReorderLevel(req, res) {
  try {
    const { productId } = req.params;
    const { reorder_level } = req.body;

    if (reorder_level === undefined || reorder_level < 0) {
      return res.status(400).json({ message: 'A valid reorder_level is required.' });
    }

    const where = { product_id: productId };
    if (req.user.role === 'warehouse_manager') where.warehouse_id = req.user.warehouse_id;
    else if (req.user.role === 'store_manager') where.store_id = req.user.store_id;
    else return res.status(400).json({ message: 'This endpoint is for Warehouse or Store Managers only.' });

    const [setting] = await ProductLocationSetting.findOrCreate({ where, defaults: { ...where, reorder_level } });
    setting.reorder_level = reorder_level;
    await setting.save();

    res.json({ message: 'Reorder level updated.', setting });
  } catch (error) {
    console.error('Set reorder level error:', error);
    res.status(500).json({ message: 'Something went wrong while updating the reorder level.' });
  }
}

// GET /api/inventory/variant-reorder-level/:variantId — current user's location-specific level
async function getVariantReorderLevel(req, res) {
  try {
    const where = { variant_id: req.params.variantId };
    if (req.user.role === 'warehouse_manager') where.warehouse_id = req.user.warehouse_id;
    else if (req.user.role === 'store_manager') where.store_id = req.user.store_id;
    else return res.status(400).json({ message: 'This endpoint is for Warehouse or Store Managers only.' });

    const setting = await VariantLocationSetting.findOne({ where });
    res.json({ reorder_level: setting ? setting.reorder_level : 5 });
  } catch (error) {
    console.error('Get variant reorder level error:', error);
    res.status(500).json({ message: 'Something went wrong while fetching the variant reorder level.' });
  }
}

// PUT /api/inventory/variant-reorder-level/:variantId — current user's location-specific level
async function setVariantReorderLevel(req, res) {
  try {
    const { reorder_level } = req.body;
    if (!Number.isInteger(Number(reorder_level)) || Number(reorder_level) < 0) {
      return res.status(400).json({ message: 'A whole-number reorder level of zero or more is required.' });
    }

    const where = { variant_id: req.params.variantId };
    if (req.user.role === 'warehouse_manager') where.warehouse_id = req.user.warehouse_id;
    else if (req.user.role === 'store_manager') where.store_id = req.user.store_id;
    else return res.status(400).json({ message: 'This endpoint is for Warehouse or Store Managers only.' });

    const [setting] = await VariantLocationSetting.findOrCreate({
      where,
      defaults: { ...where, reorder_level: Number(reorder_level) },
    });
    setting.reorder_level = Number(reorder_level);
    await setting.save();
    res.json({ message: 'Variant reorder level updated.', setting });
  } catch (error) {
    console.error('Set variant reorder level error:', error);
    res.status(500).json({ message: 'Something went wrong while updating the variant reorder level.' });
  }
}

module.exports = {
  listInventory, getWarehouseStock, getInventorySummary, lowStockAlerts, getReorderLevel, setReorderLevel,
  getVariantReorderLevel, setVariantReorderLevel,
};
