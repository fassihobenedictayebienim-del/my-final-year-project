async function migrateProductDescription(sequelize) {
  const [columns] = await sequelize.query(
    "SHOW COLUMNS FROM `products` LIKE 'description'",
  );
  if (!columns.length) {
    await sequelize.query(
      "ALTER TABLE `products` ADD COLUMN `description` TEXT NULL AFTER `product_name`",
    );
    console.log("Added optional product description field.");
  }
}
module.exports = { migrateProductDescription };
