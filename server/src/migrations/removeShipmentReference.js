async function removeShipmentReference(sequelize) {
  const [columns] = await sequelize.query(
    "SHOW COLUMNS FROM `shipment_batches` LIKE 'shipment_reference'",
  );
  if (columns.length)
    await sequelize.query(
      "ALTER TABLE `shipment_batches` DROP COLUMN `shipment_reference`",
    );
}
module.exports = { removeShipmentReference };
