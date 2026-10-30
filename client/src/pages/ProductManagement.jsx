import { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import { useToast } from "../context/ToastContext";
import api from "../services/api";
import { formatCurrency } from "../utils/currency";
import { EmptyState, TableSkeleton } from "../components/PageStates";
import StockStatusBadge from "../components/StockStatusBadge";

export default function ProductManagement() {
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("product") || "",
  );
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState(null);
  async function load() {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([
        api.get("/products"),
        api.get("/inventory/summary"),
      ]);
      setProducts(p.data.products);
      setSummary(s.data.summary || []);
    } catch {
      showToast("Failed to load products.", "error");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  const rows = useMemo(
    () =>
      products.map((product) => ({
        ...product,
        ...(summary.find((r) => r.product_id === product.product_id) || {
          total_quantity: 0,
          reorder_level: 0,
          status: "out",
        }),
      })),
    [products, summary],
  );
  const filtered = rows.filter(
    (p) =>
      `${p.product_id} ${p.product_name}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) &&
      (searchParams.get("lowStock") !== "1" || p.status !== "ok"),
  );
  function productStatus(product) {
    const quantity = Number(product.total_quantity);
    if (quantity === 0) return "out";
    return quantity <= Number(product.reorder_level) ? "low" : "ok";
  }
  async function saveEdit(event) {
    event.preventDefault();
    try {
      await api.put(`/products/${editing}`, editData);
      showToast("Product updated successfully.");
      setEditing(null);
      load();
    } catch (error) {
      showToast(
        error.response?.data?.message || "Failed to update product.",
        "error",
      );
    }
  }
  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Warehouse Product Management</h1>
          <p>
            Maintain product details and warehouse reorder levels.
          </p>
        </div>
      </div>
      <p className="form-hint" style={{ marginBottom: 16 }}>
        To receive stock, use Shipments.
      </p>
      <input
        className="form-input"
        aria-label="Search products"
        placeholder="Search by product name or ID..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ width: "100%", maxWidth: 420, marginBottom: 16 }}
      />
      {loading ? (
        <TableSkeleton columns={7} />
      ) : !filtered.length ? (
        <EmptyState
          title="No products match this view"
          detail="Try another search or receive a product through Shipments."
        />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th className="col-text">Product ID</th>
                <th className="col-text">Name</th>
                <th className="col-num">Unit Price</th>
                <th className="col-num">Quantity</th>
                <th className="col-center">Status</th>
                <th className="col-num">Reorder Level</th>
                <th className="col-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) =>
                editing === p.product_id ? (
                  <tr key={p.product_id}>
                    <td className="mono col-text">{p.product_id}</td>
                    <td className="col-text">
                      <input
                        className="form-input"
                        value={editData.product_name}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            product_name: e.target.value,
                          })
                        }
                      />
                    </td>
                    <td className="col-num">
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editData.unit_price}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            unit_price: e.target.value,
                          })
                        }
                      />
                    </td>
                    <td className="col-num">{p.total_quantity}</td>
                    <td className="col-center">
                      <StockStatusBadge status={productStatus(p)} />
                    </td>
                    <td className="col-num">
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        value={editData.reorder_level}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            reorder_level: e.target.value,
                          })
                        }
                      />
                    </td>
                    <td className="col-center">
                      <div className="action-buttons">
                        <button className="btn btn-sm btn-secondary" onClick={() => { setEditing(null); setEditData(null); }}>
                          Cancel
                        </button>
                        <button className="btn btn-sm btn-primary" onClick={saveEdit}>
                          Save
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={p.product_id}
                    className={p.status !== "ok" ? "low-stock-row" : ""}
                  >
                    <td className="mono col-text">{p.product_id}</td>
                    <td className="col-text">{p.product_name}</td>
                    <td className="col-num">{formatCurrency(p.unit_price)}</td>
                    <td className="col-num"><strong>{p.total_quantity}</strong></td>
                    <td className="col-center">
                      <StockStatusBadge status={productStatus(p)} />
                    </td>
                    <td className="col-num">{p.reorder_level}</td>
                    <td className="col-center">
                      <div className="action-buttons">
                        <button
                          className="btn btn-sm"
                          onClick={() => {
                            setEditing(p.product_id);
                            setEditData({
                              product_name: p.product_name,
                              unit_price: p.unit_price,
                              reorder_level: p.reorder_level,
                            });
                          }}
                        >
                          <Pencil size={14} /> Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
