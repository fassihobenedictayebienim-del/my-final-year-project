const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { sequelize, testConnection } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const Product = require('./models/Product');
const Shipment = require('./models/Shipment');
const shipmentRoutes = require('./routes/shipmentRoutes');
const StockRequest = require('./models/StockRequest');
const stockRequestRoutes = require('./routes/stockRequestRoutes');
const StockTransfer = require('./models/StockTransfer');
const Sale = require('./models/Sale');
const saleRoutes = require('./routes/saleRoutes');
const Inventory = require('./models/Inventory');
const inventoryRoutes = require('./routes/inventoryRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/stock-requests', stockRequestRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/inventory', inventoryRoutes);

const PORT = process.env.PORT || 5000;

Shipment.belongsTo(Product, { foreignKey: 'product_id' });
StockRequest.belongsTo(Product, { foreignKey: 'product_id' });
StockTransfer.belongsTo(StockRequest, { foreignKey: 'request_id' });
Sale.belongsTo(Product, { foreignKey: 'product_id' });
Inventory.belongsTo(Product, { foreignKey: 'product_id' });

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