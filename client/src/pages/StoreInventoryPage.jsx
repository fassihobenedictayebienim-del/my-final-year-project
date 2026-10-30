import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useToast } from "../context/ToastContext";
import api from "../services/api";
import { formatCurrency } from "../utils/currency";
import { Boxes, CircleAlert, PackageCheck } from "lucide-react";
import StatCard from "../components/StatCard";
import { EmptyState, TableSkeleton } from "../components/PageStates";
import StockStatusBadge from "../components/StockStatusBadge";

export default function StoreInventoryPage() {
  const { showToast } = useToast();
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [level, setLevel] = useState("");
  async function load() {
    setLoading(true);
    try {
      setSummary((await api.get("/inventory/summary")).data.summary);
    } catch {
      showToast("Failed to load your store inventory.", "error");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function save(productId) {
    try {
      await api.put(`/inventory/reorder-level/${productId}`, {
        reorder_level: level,
      });
      setEditing(null);
      showToast("Reorder level updated.");
      load();
    } catch (error) {
      showToast(
        error.response?.data?.message || "Failed to update reorder level.",
        "error",
      );
    }
  }
  const rows = summary.filter((row) =>
    `${row.product_name} ${row.product_id}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const lowCount = summary.filter((row) => row.status !== "ok").length;
  const stockCount = summary.reduce(
    (total, row) => total + Number(row.total_quantity),
    0,
  );
  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>My Store Inventory</h1>
          <p>
            Everything currently in stock at your store, with reorder levels.
          </p>
        </div>
      </div>
      <div className="stat-grid cols-3">
        <StatCard
          icon={Boxes}
          label="Products Tracked"
          value={summary.length}
        />
        <StatCard
          icon={PackageCheck}
          label="Units on Hand"
          value={stockCount}
          tone="success"
        />
        <StatCard
          icon={CircleAlert}
          label="Needs Attention"
          value={lowCount}
          tone={lowCount ? "warning" : "success"}
        />
      </div>
      <section className="report-section">
        <div className="report-section-content">
          <div className="form-row">
            <div>
              <label className="form-label" htmlFor="inventory-search">
                Find a product
              </label>
              <input
                id="inventory-search"
                className="form-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search product name or ID..."
                style={{ minWidth: 280 }}
              />
            </div>
          </div>
          {loading ? (
            <TableSkeleton columns={6} />
          ) : !rows.length ? (
            <EmptyState
              title="No inventory matches your search"
              detail="Products received by your store will be shown here."
            />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="col-text">Product</th>
                    <th className="col-num">Unit Price</th>
                    <th className="col-num">Total Stock</th>
                    <th className="col-num">Reorder Level</th>
                    <th className="col-center">Status</th>
                    <th className="col-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.product_id}>
                      <td className="col-text">{row.product_name}</td>
                      <td className="col-num">
                        {formatCurrency(row.unit_price)}
                      </td>
                      <td className="col-num">{row.total_quantity}</td>
                      <td className="col-num">
                        {editing === row.product_id ? (
                          <input
                            aria-label={`Reorder level for ${row.product_name}`}
                            className="form-input"
                            type="number"
                            min="0"
                            value={level}
                            onChange={(e) => setLevel(e.target.value)}
                            style={{ width: 80 }}
                          />
                        ) : (
                          row.reorder_level
                        )}
                      </td>
                      <td className="col-center">
                        <StockStatusBadge status={row.status} lowLabel="Reorder Required" />
                      </td>
                      <td className="col-center">
                        {editing === row.product_id ? (
                          <div className="action-buttons">
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => setEditing(null)}
                            >
                              Cancel
                            </button>
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => save(row.product_id)}
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn btn-sm"
                            onClick={() => {
                              setEditing(row.product_id);
                              setLevel(row.reorder_level);
                            }}
                          >
                            Set Reorder Level
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
