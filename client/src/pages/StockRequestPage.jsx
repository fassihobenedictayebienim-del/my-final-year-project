import { useEffect, useState } from "react";
import CollapsibleSection from "../components/CollapsibleSection";
import Layout from "../components/Layout";
import { useToast } from "../context/ToastContext";
import api from "../services/api";
import { EmptyState, TableSkeleton } from "../components/PageStates";
import StockStatusBadge from "../components/StockStatusBadge";

export default function StockRequestPage() {
  const { showToast } = useToast();
  const [stock, setStock] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState({});
  const [showHistory, setShowHistory] = useState(false);
  async function load() {
    setLoading(true);
    try {
      const [inventory, request] = await Promise.all([
        api.get("/inventory/warehouse-stock"),
        api.get("/stock-requests"),
      ]);
      setStock(inventory.data.inventory || []);
      setRequests(request.data.requests || []);
    } catch {
      showToast("Failed to load stock requests.", "error");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function request(productId) {
    const quantity = Number(quantities[productId]);
    if (!Number.isInteger(quantity) || quantity <= 0)
      return showToast("Enter a positive whole-number quantity.", "error");
    try {
      await api.post("/stock-requests", { product_id: productId, quantity });
      showToast("Stock request submitted.");
      setQuantities({ ...quantities, [productId]: "" });
      load();
    } catch (error) {
      showToast(
        error.response?.data?.message || "Failed to submit the request.",
        "error",
      );
    }
  }
  async function cancel(id) {
    if (!window.confirm("Cancel this pending stock request?")) return;
    try {
      await api.put(`/stock-requests/${id}/cancel`);
      showToast("Request cancelled.");
      load();
    } catch (error) {
      showToast(
        error.response?.data?.message || "Unable to cancel request.",
        "error",
      );
    }
  }
  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Stock Request</h1>
          <p>
            Request products from the warehouse and track your past requests.
          </p>
        </div>
      </div>
      <section className="report-section">
        <div className="report-section-content">
          <h3>Request Stock</h3>
          {loading ? (
            <TableSkeleton columns={6} />
          ) : !stock.length ? (
            <EmptyState
              title="No warehouse products are available"
              detail="Try again after the warehouse receives stock."
            />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="col-text">Product ID</th>
                    <th className="col-text">Product Name</th>
                    <th className="col-num">Total in Warehouse</th>
                    <th className="col-center">Availability</th>
                    <th className="col-num">Quantity to Request</th>
                    <th className="col-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.map((row) => (
                    <tr key={row.product_id}>
                      <td className="mono col-text">{row.product_id}</td>
                      <td className="col-text">{row.Product?.product_name}</td>
                      <td className="col-num">{row.quantity}</td>
                      <td className="col-center">
                        <StockStatusBadge status={row.quantity > 0 ? "ok" : "out"} />
                      </td>
                      <td className="col-num">
                        <input
                          aria-label={`Quantity requested for ${row.Product?.product_name}`}
                          className="form-input"
                          type="number"
                          min="1"
                          max={row.quantity}
                          value={quantities[row.product_id] || ""}
                          onChange={(e) =>
                            setQuantities({
                              ...quantities,
                              [row.product_id]: e.target.value,
                            })
                          }
                          style={{ width: 100 }}
                        />
                      </td>
                      <td className="col-center">
                        <button
                          className="btn btn-sm btn-primary"
                          disabled={!row.quantity}
                          onClick={() => request(row.product_id)}
                        >
                          Request
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
      <CollapsibleSection
        title={`My Request History (${requests.length})`}
        open={showHistory}
        onToggle={() => setShowHistory(!showHistory)}
      >
        {!requests.length ? (
          <EmptyState
            title="No requests made yet"
            detail="Requests you submit will appear here."
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="col-text">Date</th>
                  <th className="col-text">Product</th>
                  <th className="col-num">Quantity</th>
                  <th className="col-center">Status</th>
                  <th className="col-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.request_id}>
                    <td className="col-text">{new Date(r.request_date).toLocaleDateString()}</td>
                    <td className="col-text">{r.Product?.product_name}</td>
                    <td className="col-num">{r.quantity}</td>
                    <td className="col-center">
                      <span className={`badge badge-${r.status}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="col-center">
                      {r.status === "pending" ? (
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => cancel(r.request_id)}
                        >
                          Cancel
                        </button>
                      ) : r.status === "approved" ? (
                        <button
                          className="btn btn-sm btn-success"
                          onClick={async () => {
                            try {
                              await api.put(
                                `/stock-requests/${r.request_id}/confirm-receipt`,
                              );
                              showToast("Receipt confirmed.");
                              load();
                            } catch (error) {
                              showToast(
                                error.response?.data?.message ||
                                  "Unable to confirm receipt.",
                                "error",
                              );
                            }
                          }}
                        >
                          Confirm Receipt
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CollapsibleSection>
    </Layout>
  );
}
