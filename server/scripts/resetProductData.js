/*
 * One-time development reset for the product-level inventory system.
 *
 * Keeps accounts and locations intact. It deliberately uses DELETE statements
 * (rather than TRUNCATE) inside one transaction, so a failure rolls back every
 * deletion. Legacy product_variants are not touched: the current application
 * no longer reads them. The database cascades product deletion to any legacy
 * variant rows, so the table remains but its old rows are removed automatically.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { sequelize } = require('../src/config/db');

const resetTables = [
  'sales',
  'stock_transfers',
  'stock_requests',
  'shipments',
  'shipment_batches',
  'inventory',
  'product_location_settings',
  'activity_logs',
  'products',
];

const protectedTables = ['users', 'warehouses', 'stores'];
const legacyVariantTable = 'product_variants';

async function countRows(table, transaction) {
  const [rows] = await sequelize.query(`SELECT COUNT(*) AS count FROM \`${table}\``, { transaction });
  return Number(rows[0].count);
}

async function countsFor(tables, transaction) {
  return Object.fromEntries(await Promise.all(tables.map(async (table) => [table, await countRows(table, transaction)])));
}

async function main() {
  await sequelize.authenticate();

  const before = await countsFor([...resetTables, ...protectedTables, legacyVariantTable]);
  const [activityBreakdown] = await sequelize.query('SELECT action, COUNT(*) AS count FROM activity_logs GROUP BY action ORDER BY count DESC');
  console.log('Activity log contains general system events:', activityBreakdown);
  console.log('Counts before reset:', before);

  await sequelize.transaction(async (transaction) => {
    for (const table of resetTables) {
      await sequelize.query(`DELETE FROM \`${table}\``, { transaction });
    }
  });

  const after = await countsFor([...resetTables, ...protectedTables, legacyVariantTable]);
  const resetSucceeded = resetTables.every((table) => after[table] === 0);
  const protectedUntouched = protectedTables.every((table) => after[table] === before[table]);
  const legacyVariantsCleared = after[legacyVariantTable] === 0;

  console.log('Counts after reset:', after);
  if (!resetSucceeded || !protectedUntouched || !legacyVariantsCleared) {
    throw new Error('Reset verification failed: expected reset tables and legacy variants to be empty and protected tables to be unchanged.');
  }
  console.log('Product data reset verified successfully. Users, warehouses, and stores were unchanged; legacy product_variant rows were cleared by the product foreign-key cascade.');
}

main()
  .catch((error) => { console.error('Product data reset failed:', error); process.exitCode = 1; })
  .finally(async () => { await sequelize.close(); });
