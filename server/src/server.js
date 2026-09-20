const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { sequelize, testConnection } = require('./config/db');

const Product = require('./models/Product');
const ProductVariant = require('./models/ProductVariant');
const ProductLocationSetting = require('./models/ProductLocationSetting');
const VariantLocationSetting = require('./models/VariantLocationSetting');
const Inventory = require('./models/Inventory');
const Shipment = require('./models/Shipment');
const ShipmentBatch = require('./models/ShipmentBatch');
const StockRequest = require('./models/StockRequest');
const StockTransfer = require('./models/StockTransfer');
const Sale = require('./models/Sale');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const shipmentRoutes = require('./routes/shipmentRoutes');
const stockRequestRoutes = require('./routes/stockRequestRoutes');
const saleRoutes = require('./routes/saleRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const reportRoutes = require('./routes/reportRoutes');
const userRoutes = require('./routes/userRoutes');
const locationRoutes = require('./routes/locationRoutes');
const activityLogRoutes = require('./routes/activityLogRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Requests without an Origin header include tools such as health checks.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  },
}));
app.use(express.json());

ProductVariant.belongsTo(Product, { foreignKey: 'product_id' });
Product.hasMany(ProductVariant, { foreignKey: 'product_id' });

Inventory.belongsTo(ProductVariant, { foreignKey: 'variant_id' });

Shipment.belongsTo(ProductVariant, { foreignKey: 'variant_id' });
ShipmentBatch.hasMany(Shipment, { foreignKey: 'shipment_batch_id' });
Shipment.belongsTo(ShipmentBatch, { foreignKey: 'shipment_batch_id' });

StockRequest.belongsTo(ProductVariant, { foreignKey: 'variant_id' });
Sale.belongsTo(ProductVariant, { foreignKey: 'variant_id' });
StockTransfer.belongsTo(StockRequest, { foreignKey: 'request_id' });

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/stock-requests', stockRequestRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);

  await testConnection();

  try {
    await sequelize.sync();
    console.log('Models synced with database.');
  } catch (error) {
    console.error('Model sync failed:', error.message);
  }
});
