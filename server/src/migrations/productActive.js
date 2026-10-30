async function migrateProductActive(sequelize) {
  const [columns] = await sequelize.query(
    "SHOW COLUMNS FROM `products` LIKE 'active'",
  );
  if (!columns.length) {
    await sequelize.query(
      "ALTER TABLE `products` ADD COLUMN `active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `unit_price`",
    );
  }
}

module.exports = { migrateProductActive };
