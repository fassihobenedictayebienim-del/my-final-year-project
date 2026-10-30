const { QueryTypes } = require("sequelize");

async function hasColumn(sequelize, table, column) {
  const [rows] = await sequelize.query(
    `SHOW COLUMNS FROM \`${table}\` LIKE ?`,
    { replacements: [column] },
  );
  return rows.length > 0;
}

async function foreignKeysForColumn(sequelize, table, column) {
  return sequelize.query(
    `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
       AND REFERENCED_TABLE_NAME IS NOT NULL`,
    { replacements: [table, column], type: QueryTypes.SELECT },
  );
}

async function dropForeignKeysForColumn(sequelize, table, column) {
  const keys = await foreignKeysForColumn(sequelize, table, column);
  for (const { CONSTRAINT_NAME } of keys)
    await sequelize.query(
      `ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${CONSTRAINT_NAME}\``,
    );
}

async function indexesForColumn(sequelize, table, column) {
  const rows = await sequelize.query(`SHOW INDEX FROM \`${table}\``, {
    type: QueryTypes.SELECT,
  });
  return [
    ...new Set(
      rows
        .filter(
          (row) => row.Column_name === column && row.Key_name !== "PRIMARY",
        )
        .map((row) => row.Key_name),
    ),
  ];
}

async function dropIndexesForColumn(sequelize, table, column) {
  for (const name of await indexesForColumn(sequelize, table, column))
    await sequelize.query(`ALTER TABLE \`${table}\` DROP INDEX \`${name}\``);
}

async function addProductColumn(sequelize, table) {
  if (!(await hasColumn(sequelize, table, "product_id"))) {
    await sequelize.query(
      `ALTER TABLE \`${table}\` ADD COLUMN \`product_id\` VARCHAR(50) NULL AFTER \`variant_id\``,
    );
    await sequelize.query(
      `UPDATE \`${table}\` row_data JOIN \`product_variants\` variants ON variants.variant_id = row_data.variant_id SET row_data.product_id = variants.product_id`,
    );
  }
  const [missing] = await sequelize.query(
    `SELECT COUNT(*) AS count FROM \`${table}\` WHERE \`product_id\` IS NULL`,
  );
  if (Number(missing[0].count) > 0)
    throw new Error(
      `${table} contains ${missing[0].count} row(s) that cannot be linked to a product. No data was changed; review those orphan records before retrying.`,
    );
}

async function migrateProductLevelInventory(sequelize) {
  if (
    (await hasColumn(sequelize, "inventory", "product_id")) &&
    !(await hasColumn(sequelize, "inventory", "variant_id"))
  )
    return;

  await sequelize.transaction(async (transaction) => {
    const options = { transaction };
    for (const table of ["inventory", "shipments", "stock_requests", "sales"])
      await addProductColumn(sequelize, table);

    // Inventory is the only table that has to be consolidated. Its old rows are
    // variant-level quantities; grouping them preserves the exact product/location total.
    await dropForeignKeysForColumn(sequelize, "inventory", "variant_id");
    await sequelize.query(
      "ALTER TABLE `inventory` MODIFY COLUMN `variant_id` INT UNSIGNED NULL",
      options,
    );
    await sequelize.query(
      "DROP TEMPORARY TABLE IF EXISTS product_inventory_rollup",
      options,
    );
    await sequelize.query(
      `CREATE TEMPORARY TABLE product_inventory_rollup AS
      SELECT product_id, warehouse_id, store_id, SUM(quantity) AS quantity, MAX(updated_at) AS updated_at
      FROM inventory GROUP BY product_id, warehouse_id, store_id`,
      options,
    );
    await sequelize.query("DELETE FROM `inventory`", options);
    await sequelize.query(
      `INSERT INTO inventory (product_id, warehouse_id, store_id, quantity, updated_at)
      SELECT product_id, warehouse_id, store_id, quantity, updated_at FROM product_inventory_rollup`,
      options,
    );
    await dropIndexesForColumn(sequelize, "inventory", "variant_id");
    await sequelize.query(
      "ALTER TABLE `inventory` DROP COLUMN `variant_id`",
      options,
    );
    await sequelize.query(
      "ALTER TABLE `inventory` MODIFY COLUMN `product_id` VARCHAR(50) NOT NULL",
      options,
    );
    await sequelize.query(
      "ALTER TABLE `inventory` ADD CONSTRAINT `fk_inventory_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE",
      options,
    );
    await sequelize.query(
      "ALTER TABLE `inventory` ADD UNIQUE KEY `uq_inventory_product_warehouse` (`product_id`, `warehouse_id`), ADD UNIQUE KEY `uq_inventory_product_store` (`product_id`, `store_id`), ADD KEY `idx_inventory_product` (`product_id`)",
      options,
    );

    for (const table of ["shipments", "stock_requests", "sales"]) {
      await dropForeignKeysForColumn(sequelize, table, "variant_id");
      await dropIndexesForColumn(sequelize, table, "variant_id");
      await sequelize.query(
        `ALTER TABLE \`${table}\` DROP COLUMN \`variant_id\`, MODIFY COLUMN \`product_id\` VARCHAR(50) NOT NULL`,
        options,
      );
      await sequelize.query(
        `ALTER TABLE \`${table}\` ADD CONSTRAINT \`fk_${table}_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\` (\`product_id\`) ON DELETE RESTRICT, ADD KEY \`idx_${table}_product\` (\`product_id\`)`,
        options,
      );
    }

    if (!(await hasColumn(sequelize, "stock_transfers", "product_id"))) {
      await sequelize.query(
        "ALTER TABLE `stock_transfers` ADD COLUMN `product_id` VARCHAR(50) NULL AFTER `store_id`",
        options,
      );
      await sequelize.query(
        "UPDATE `stock_transfers` transfer_data JOIN `stock_requests` request_data ON request_data.request_id = transfer_data.request_id SET transfer_data.product_id = request_data.product_id",
        options,
      );
    }
    const [missingTransfers] = await sequelize.query(
      "SELECT COUNT(*) AS count FROM `stock_transfers` WHERE `product_id` IS NULL",
      options,
    );
    if (Number(missingTransfers[0].count) > 0)
      throw new Error(
        `stock_transfers contains ${missingTransfers[0].count} row(s) that cannot be linked to a product. No data was changed; review those records before retrying.`,
      );
    await sequelize.query(
      "ALTER TABLE `stock_transfers` MODIFY COLUMN `product_id` VARCHAR(50) NOT NULL",
      options,
    );
    const productKeys = await foreignKeysForColumn(
      sequelize,
      "stock_transfers",
      "product_id",
    );
    if (!productKeys.length)
      await sequelize.query(
        "ALTER TABLE `stock_transfers` ADD CONSTRAINT `fk_stock_transfers_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE RESTRICT, ADD KEY `idx_stock_transfers_product` (`product_id`)",
        options,
      );
  });
  console.log(
    "Migrated inventory, shipments, requests, transfers, and sales to product-level stock. Existing inventory quantities were summed by product and location.",
  );
}

module.exports = { migrateProductLevelInventory };
