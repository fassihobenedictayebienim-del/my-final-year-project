const Product = require('../models/Product');
const ProductVariant = require('../models/ProductVariant');
const ProductLocationSetting = require('../models/ProductLocationSetting');
const VariantLocationSetting = require('../models/VariantLocationSetting');
const Inventory = require('../models/Inventory');
const Shipment = require('../models/Shipment');
const { sequelize } = require('../config/db');
const logActivity = require('../utils/activityLogger');

async function listProducts(req, res) {
  try {
    const products = await Product.findAll({ order: [['product_name', 'ASC']] });
    res.json({ products });
  } catch (error) {
    console.error('List products error:', error);
    res.status(500).json({ message: 'Something went wrong while fetching products.' });
  }
}

async function getProduct(req, res) {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    res.json({ product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Something went wrong while fetching the product.' });
  }
}

async function listVariantsForProduct(req, res) {
  try {
    const { id } = req.params;
    const variants = await ProductVariant.findAll({ where: { product_id: id }, order: [['color', 'ASC'], ['size', 'ASC']] });

    const where = {};
    if (req.user.role === 'warehouse_manager') where.warehouse_id = req.user.warehouse_id;
    if (req.user.role === 'store_manager') where.store_id = req.user.store_id;

    const variantIds = variants.map((v) => v.variant_id);
    const inventoryRows = variantIds.length
      ? await Inventory.findAll({ where: { ...where, variant_id: variantIds } })
      : [];
    const settingWhere = {};
    if (req.user.role === 'warehouse_manager') settingWhere.warehouse_id = req.user.warehouse_id;
    if (req.user.role === 'store_manager') settingWhere.store_id = req.user.store_id;
    const variantSettings = Object.keys(settingWhere).length && variantIds.length
      ? await VariantLocationSetting.findAll({ where: { ...settingWhere, variant_id: variantIds } })
      : [];
    const reorderMap = {};
    variantSettings.forEach((setting) => { reorderMap[setting.variant_id] = setting.reorder_level; });

    const result = variants.map((v) => {
      const rows = inventoryRows.filter((i) => i.variant_id === v.variant_id);
      return {
        variant_id: v.variant_id, color: v.color, size: v.size,
        inventory: rows.map((r) => ({ warehouse_id: r.warehouse_id, store_id: r.store_id, quantity: r.quantity })),
        quantity: rows.reduce((sum, r) => sum + r.quantity, 0),
        reorder_level: reorderMap[v.variant_id] ?? 5,
      };
    });

    res.json({ variants: result });
  } catch (error) {
    console.error('List variants error:', error);
    res.status(500).json({ message: 'Something went wrong while fetching variants.' });
  }
}

// GET /api/products/variants/all — Warehouse Manager or Administrator only
// Every variant in the ENTIRE catalog, including ones with zero stock
// anywhere yet, so Record Shipment can bring in stock for a brand-new
// variant. This is deliberately separate from /inventory (which only
// shows variants that already have a stock row) so a newly-added
// variant is never invisible to shipment recording.
async function listAllVariants(req, res) {
  try {
    const variants = await ProductVariant.findAll({
      include: [{ model: Product }],
      order: [['product_id', 'ASC'], ['color', 'ASC'], ['size', 'ASC']],
    });

    const warehouse_id = req.user.warehouse_id;
    const variantIds = variants.map((v) => v.variant_id);
    const inventoryRows = warehouse_id && variantIds.length
      ? await Inventory.findAll({ where: { warehouse_id, variant_id: variantIds } })
      : [];
    const quantityMap = {};
    inventoryRows.forEach((r) => { quantityMap[r.variant_id] = r.quantity; });

    const result = variants.map((v) => ({
      variant_id: v.variant_id,
      product_id: v.product_id,
      product_name: v.Product.product_name,
      color: v.color,
      size: v.size,
      quantity: quantityMap[v.variant_id] || 0,
    }));

    res.json({ variants: result });
  } catch (error) {
    console.error('List all variants error:', error);
    res.status(500).json({ message: 'Something went wrong while fetching variants.' });
  }
}

async function createProduct(req, res) {
  const t = await sequelize.transaction();
  try {
    const { product_id, product_name, unit_price, reorder_level, variants } = req.body;

    if (!product_id || !product_name || unit_price === undefined) {
      await t.rollback();
      return res.status(400).json({ message: 'product_id, product_name, and unit_price are required.' });
    }
    if (unit_price < 0) {
      await t.rollback();
      return res.status(400).json({ message: 'unit_price cannot be negative.' });
    }
    if (!Array.isArray(variants) || variants.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: 'At least one variant (colour + size) is required.' });
    }

    const existing = await Product.findByPk(product_id, { transaction: t });
    if (existing) {
      await t.rollback();
      return res.status(409).json({ message: `A product with ID "${product_id}" already exists.` });
    }

    const seen = new Set();
    for (const v of variants) {
      if (!v.color || !v.size) {
        await t.rollback();
        return res.status(400).json({ message: 'Every variant needs a colour and a size.' });
      }
      const key = `${v.color.trim().toLowerCase()}__${v.size.trim().toLowerCase()}`;
      if (seen.has(key)) {
        await t.rollback();
        return res.status(400).json({ message: `Duplicate variant: ${v.color} / ${v.size} was entered more than once.` });
      }
      seen.add(key);
    }

    const product = await Product.create({ product_id, product_name, unit_price }, { transaction: t });

    const warehouse_id = req.user.warehouse_id;
    let totalReceived = 0;
    const createdVariants = [];

    for (const v of variants) {
      const variant = await ProductVariant.create(
        { product_id, color: v.color.trim(), size: v.size.trim() },
        { transaction: t }
      );

      const qty = Number(v.quantity) || 0;
      if (qty > 0) {
        if (!warehouse_id) {
          await t.rollback();
          return res.status(400).json({ message: 'Your account is not linked to a warehouse, cannot record initial stock.' });
        }
        await Shipment.create(
          { variant_id: variant.variant_id, warehouse_id, quantity: qty, date_received: new Date() },
          { transaction: t }
        );
        await Inventory.create(
          { variant_id: variant.variant_id, warehouse_id, quantity: qty },
          { transaction: t }
        );
        totalReceived += qty;
      }
      createdVariants.push({ variant_id: variant.variant_id, color: variant.color, size: variant.size, quantity: qty });
    }

    if (warehouse_id) {
      await ProductLocationSetting.create(
        { product_id, warehouse_id, reorder_level: reorder_level || 0 },
        { transaction: t }
      );
    }

    await t.commit();

    await logActivity(req.user, 'PRODUCT_CREATED', `Product "${product_name}" (${product_id}) created with ${variants.length} variant(s), ${totalReceived} total pairs received.`);

    res.status(201).json({
      message: `Product created with ${variants.length} variant(s)${totalReceived > 0 ? ` and ${totalReceived} pairs received` : ''}.`,
      product, variants: createdVariants,
    });
  } catch (error) {
    await t.rollback();
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Something went wrong while creating the product.' });
  }
}

async function updateProduct(req, res) {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    const { product_name, unit_price } = req.body;
    if (unit_price !== undefined && unit_price < 0) {
      return res.status(400).json({ message: 'unit_price cannot be negative.' });
    }

    await product.update({
      product_name: product_name ?? product.product_name,
      unit_price: unit_price ?? product.unit_price,
    });

    await logActivity(req.user, 'PRODUCT_UPDATED', `Product "${product.product_name}" (${product.product_id}) updated.`);

    res.json({ message: 'Product updated successfully.', product });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Something went wrong while updating the product.' });
  }
}

async function deleteProduct(req, res) {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    const name = product.product_name, id = product.product_id;
    await product.destroy();

    await logActivity(req.user, 'PRODUCT_DELETED', `Product "${name}" (${id}) deleted.`);

    res.json({ message: 'Product deleted successfully.' });
  } catch (error) {
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(409).json({
        message: 'This product cannot be deleted because its variants already have related records (shipments, sales, inventory, or requests).',
      });
    }
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Something went wrong while deleting the product.' });
  }
}

async function addVariant(req, res) {
  try {
    const { id } = req.params;
    const { color, size } = req.body;

    if (!color || !size) return res.status(400).json({ message: 'Colour and size are required.' });

    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    const existing = await ProductVariant.findOne({ where: { product_id: id, color: color.trim(), size: size.trim() } });
    if (existing) return res.status(409).json({ message: `Variant ${color} / ${size} already exists for this product.` });

    const variant = await ProductVariant.create({ product_id: id, color: color.trim(), size: size.trim() });

    await logActivity(req.user, 'VARIANT_ADDED', `Variant ${color}/${size} added to "${product.product_name}" (${id}).`);

    res.status(201).json({ message: 'Variant added. Use Record Shipment to bring in stock for it.', variant });
  } catch (error) {
    console.error('Add variant error:', error);
    res.status(500).json({ message: 'Something went wrong while adding the variant.' });
  }
}

async function deleteVariant(req, res) {
  try {
    const variant = await ProductVariant.findByPk(req.params.variantId);
    if (!variant) return res.status(404).json({ message: 'Variant not found.' });

    const label = `${variant.color}/${variant.size}`;
    await variant.destroy();

    await logActivity(req.user, 'VARIANT_DELETED', `Variant ${label} deleted from product ${variant.product_id}.`);

    res.json({ message: 'Variant deleted successfully.' });
  } catch (error) {
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(409).json({
        message: 'This variant cannot be deleted because it already has related records (shipments, sales, inventory, or requests).',
      });
    }
    console.error('Delete variant error:', error);
    res.status(500).json({ message: 'Something went wrong while deleting the variant.' });
  }
}

module.exports = {
  listProducts, getProduct, createProduct, updateProduct, deleteProduct,
  listVariantsForProduct, addVariant, deleteVariant, listAllVariants,
};
