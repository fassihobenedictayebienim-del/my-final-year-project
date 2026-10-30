async function migrateStoreActive(sequelize) {
  const [columns] = await sequelize.query(
    "SHOW COLUMNS FROM `stores` LIKE 'active'",
  );
  if (!columns.length)
    await sequelize.query(
      "ALTER TABLE `stores` ADD COLUMN `active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `location`",
    );
}
module.exports = { migrateStoreActive };
