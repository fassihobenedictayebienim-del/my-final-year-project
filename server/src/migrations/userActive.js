async function migrateUserActive(sequelize) {
  const [columns] = await sequelize.query(
    "SHOW COLUMNS FROM `users` LIKE 'active'",
  );
  if (!columns.length) {
    await sequelize.query(
      "ALTER TABLE `users` ADD COLUMN `active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `store_id`",
    );
    console.log("Added user active status field.");
  }
  // Old soft-deleted managers must not keep a live location assignment.
  await sequelize.query(
    "UPDATE `users` SET `warehouse_id` = NULL, `store_id` = NULL, `role` = 'administrator' WHERE `active` = 0 AND (`warehouse_id` IS NOT NULL OR `store_id` IS NOT NULL)",
  );
}
module.exports = { migrateUserActive };
