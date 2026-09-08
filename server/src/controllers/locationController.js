const Warehouse = require('../models/Warehouse');
const Store = require('../models/Store');
const logActivity = require('../utils/activityLogger');

async function listLocations(req, res) {
  try {
    const warehouses = await Warehouse.findAll();
    const stores = await Store.findAll();
    res.json({ warehouses, stores });
  } catch (error) {
    console.error('List locations error:', error);
    res.status(500).json({ message: 'Something went wrong while fetching locations.' });
  }
}

async function updateWarehouse(req, res) {
  try {
    const warehouse = await Warehouse.findByPk(req.params.id);
    if (!warehouse) return res.status(404).json({ message: 'Warehouse not found.' });
    const { name, location } = req.body;
    await warehouse.update({ name: name ?? warehouse.name, location: location ?? warehouse.location });

    await logActivity(req.user, 'LOCATION_UPDATED', `Warehouse "${warehouse.name}" updated.`);

    res.json({ message: 'Warehouse updated successfully.', warehouse });
  } catch (error) {
    console.error('Update warehouse error:', error);
    res.status(500).json({ message: 'Something went wrong while updating the warehouse.' });
  }
}

async function updateStore(req, res) {
  try {
    const store = await Store.findByPk(req.params.id);
    if (!store) return res.status(404).json({ message: 'Store not found.' });
    const { name, location } = req.body;
    await store.update({ name: name ?? store.name, location: location ?? store.location });

    await logActivity(req.user, 'LOCATION_UPDATED', `Store "${store.name}" updated.`);

    res.json({ message: 'Store updated successfully.', store });
  } catch (error) {
    console.error('Update store error:', error);
    res.status(500).json({ message: 'Something went wrong while updating the store.' });
  }
}

module.exports = { listLocations, updateWarehouse, updateStore };