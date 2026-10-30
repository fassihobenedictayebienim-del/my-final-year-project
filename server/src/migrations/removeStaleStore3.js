async function removeStaleStore3(sequelize) {
  // Deliberately targets only the known test location; never touches real stores.
  const [stores] = await sequelize.query(
    "SELECT store_id, name, location FROM stores WHERE active = 1 AND (name = 'Store 3' OR location = 'Store 3')",
  );
  for (const store of stores) {
    const id = store.store_id;
    const [[stock]] = await sequelize.query(
      "SELECT COALESCE(SUM(quantity), 0) AS value FROM inventory WHERE store_id = ?",
      { replacements: [id] },
    );
    const [[pending]] = await sequelize.query(
      "SELECT COUNT(*) AS value FROM stock_requests WHERE store_id = ? AND status IN ('pending', 'approved')",
      { replacements: [id] },
    );
    const [[transit]] = await sequelize.query(
      "SELECT COUNT(*) AS value FROM stock_transfers WHERE store_id = ? AND status = 'dispatched'",
      { replacements: [id] },
    );
    if (Number(stock.value) || Number(pending.value) || Number(transit.value)) {
      console.warn(
        `Store 3 (${id}) was retained: it has active stock or transfers.`,
      );
      continue;
    }
    const [[history]] = await sequelize.query(
      "SELECT ((SELECT COUNT(*) FROM sales WHERE store_id = ?) + (SELECT COUNT(*) FROM stock_requests WHERE store_id = ?) + (SELECT COUNT(*) FROM stock_transfers WHERE store_id = ?)) AS value",
      { replacements: [id, id, id] },
    );
    if (Number(history.value)) {
      await sequelize.query("UPDATE stores SET active = 0 WHERE store_id = ?", {
        replacements: [id],
      });
      await sequelize.query(
        "UPDATE users SET warehouse_id = NULL, store_id = NULL, role = 'administrator', active = 0 WHERE store_id = ?",
        { replacements: [id] },
      );
    } else {
      await sequelize.query(
        "UPDATE users SET warehouse_id = NULL, store_id = NULL, role = 'administrator', active = 0 WHERE store_id = ?",
        { replacements: [id] },
      );
      await sequelize.query("DELETE FROM stores WHERE store_id = ?", {
        replacements: [id],
      });
    }
    await sequelize.query(
      "INSERT INTO activity_logs (user_id, user_name, user_role, action, details, created_at) VALUES (NULL, 'System', 'system', 'STORE_REMOVED', ?, NOW())",
      {
        replacements: [
          `${Number(history.value) ? "Deactivated" : "Deleted"} stale Store 3 (${store.location}) during migration.`,
        ],
      },
    );
    console.log(
      `Removed stale Store 3 (${id}) by ${Number(history.value) ? "deactivation" : "hard deletion"}.`,
    );
  }
}
module.exports = { removeStaleStore3 };
