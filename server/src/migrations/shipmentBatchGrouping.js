async function migrateShipmentBatchGrouping(sequelize) {
  const [columns] = await sequelize.query(
    "SHOW COLUMNS FROM `shipments` LIKE 'shipment_batch_id'",
  );
  if (!columns.length) {
    await sequelize.query(
      "ALTER TABLE `shipments` ADD COLUMN `shipment_batch_id` INT UNSIGNED NULL AFTER `shipment_id`",
    );
  }
}

module.exports = { migrateShipmentBatchGrouping };
