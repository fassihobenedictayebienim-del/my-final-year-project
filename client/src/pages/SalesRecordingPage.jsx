import { useEffect, useState } from "react";
import { CircleDollarSign, ShoppingCart } from "lucide-react";
import CollapsibleSection from "../components/CollapsibleSection";
import Layout from "../components/Layout";
import PdfExportButton from "../components/PdfExportButton";
import { EmptyState } from "../components/PageStates";
import { useToast } from "../context/ToastContext";
import api from "../services/api";
import { formatCurrency } from "../utils/currency";
export default function SalesRecordingPage() {
  const { showToast } = useToast();
  const [inventory, setInventory] = useState([]);
  const [sales, setSales] = useState([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [showTodaySales, setShowTodaySales] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  async function load() {
    try {
      const [i, s] = await Promise.all([
        api.get("/inventory"),
        api.get("/sales"),
      ]);
      setInventory(i.data.inventory);
      setSales(s.data.sales);
    } catch {
      showToast("Failed to load data.", "error");
    }
  }
  useEffect(() => {
    load();
  }, []);
  const todaySales = sales.filter(
    (s) => new Date(s.sale_date).toDateString() === new Date().toDateString(),
  );
  const total = todaySales.reduce((n, s) => n + Number(s.total_price), 0);
  const sold = todaySales.reduce((n, s) => n + s.quantity, 0);
  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/sales", { product_id: productId, quantity });
      setProductId("");
      setQuantity("");
      showToast("Sale recorded successfully.");
      load();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to record sale.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }
  async function getSections(range) {
    const { data } = await api.get("/reports/sales", { params: range });
    return [
      {
        head: ["Date", "Product", "Quantity", "Total"],
        body: data.sales.map((s) => [
          new Date(s.sale_date).toLocaleString(),
          s.Product?.product_name || "—",
          String(s.quantity),
          formatCurrency(s.total_price),
        ]),
      },
    ];
  }
  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Sales Recording</h1>
          <p>Record a product sale and review today’s performance.</p>
        </div>
        <PdfExportButton
          title="Store Sales"
          fileName="store-sales"
          defaultRange="today"
          getSections={getSections}
        />
      </div>
      <div className="stat-grid cols-2">
        <div className="stat-card stat-card-info">
          <div className="stat-card-icon">
            <ShoppingCart size={19} />
          </div>
          <div>
            <p className="stat-label">Items Sold Today</p>
            <p className="stat-value">{sold}</p>
            <p className="stat-sub">Today</p>
          </div>
        </div>
        <div className="stat-card stat-card-success">
          <div className="stat-card-icon">
            <CircleDollarSign size={19} />
          </div>
          <div>
            <p className="stat-label">Revenue Today</p>
            <p className="stat-value">{formatCurrency(total)}</p>
            <p className="stat-sub">Today</p>
          </div>
        </div>
      </div>
      <form onSubmit={submit} className="form-card">
        <h3>Record Sale</h3>
        <div className="form-row">
          <div>
            <label className="form-label">Product</label>
            <select
              className="form-input"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              required
            >
              <option value="">Select product</option>
              {inventory.map((r) => (
                <option key={r.product_id} value={r.product_id}>
                  {r.Product.product_name} — {r.quantity} in stock
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Quantity</label>
            <input
              className="form-input"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setProductId("");
              setQuantity("");
            }}
            style={{ alignSelf: "end" }}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            disabled={submitting}
            style={{ alignSelf: "end" }}
          >
            {submitting ? "Recording…" : "Record Sale"}
          </button>
        </div>
      </form>
      <CollapsibleSection
        title={`Today’s Sales (${todaySales.length})`}
        open={showTodaySales}
        onToggle={() => setShowTodaySales(!showTodaySales)}
      >
        {todaySales.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="col-text">Product</th>
                  <th className="col-num">Qty</th>
                  <th className="col-num">Total</th>
                  <th className="col-text">Time</th>
                </tr>
              </thead>
              <tbody>
                {todaySales.map((s) => (
                  <tr key={s.sale_id}>
                    <td className="col-text">{s.Product?.product_name}</td>
                    <td className="col-num">{s.quantity}</td>
                    <td className="col-num">{formatCurrency(s.total_price)}</td>
                    <td className="col-text">{new Date(s.sale_date).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No sales recorded today"
            detail="Record a sale above to begin today’s activity."
          />
        )}
      </CollapsibleSection>
    </Layout>
  );
}
