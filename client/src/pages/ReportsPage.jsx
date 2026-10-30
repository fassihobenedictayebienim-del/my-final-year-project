import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  PackageSearch,
  ReceiptText,
} from "lucide-react";
import Layout from "../components/Layout";
import PdfExportButton from "../components/PdfExportButton";
import { useAuth } from "../context/AuthContext";
import StatCard from "../components/StatCard";
import api from "../services/api";
import { formatCurrency } from "../utils/currency";
const group = (lines) =>
  Object.values(
    lines.reduce((map, x) => {
      const id = x.product_id;
      if (!map[id])
        map[id] = {
          product_id: id,
          product_name: x.Product?.product_name,
          quantity: 0,
          revenue: 0,
        };
      map[id].quantity += x.quantity;
      map[id].revenue += Number(x.total_price);
      return map;
    }, {}),
  );
function Section({ title, icon: Icon, open, onToggle, children }) {
  return (
    <section className="report-section">
      <button className="report-section-toggle" onClick={onToggle}>
        <span>
          <Icon size={18} />
          {title}
        </span>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open && <div className="report-section-content">{children}</div>}
    </section>
  );
}
export default function ReportsPage() {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState({ sales: true, inventory: false });
  useEffect(() => {
    Promise.all([
      api.get("/reports/sales"),
      api.get("/reports/inventory-value"),
    ])
      .then(([s, i]) => {
        setSales(s.data.sales);
        setSummary(s.data.summary);
        setInventory(i.data.breakdown);
      })
      .finally(() => setLoading(false));
  }, []);
  const salesGroups =
    user.role === "administrator"
      ? Object.entries(
          sales.reduce((m, x) => {
            (m[x.location_label] ||= []).push(x);
            return m;
          }, {}),
        ).map(([name, values]) => [name, group(values)])
      : [["Your location", group(sales)]];
  const inventoryGroups =
    user.role === "administrator"
      ? Object.entries(
          inventory.reduce((locations, row) => {
            (locations[row.location_label] ||= []).push(row);
            return locations;
          }, {}),
        )
      : [["Your location", inventory]];
  async function getSections(range) {
    const { data } = await api.get("/reports/sales", { params: range });
    const groups =
      user.role === "administrator"
        ? Object.entries(
            data.sales.reduce((m, x) => {
              (m[x.location_label] ||= []).push(x);
              return m;
            }, {}),
          ).map(([name, values]) => [name, group(values)])
        : [["Your location", group(data.sales)]];
    return groups.map(([name, rows]) => ({
      head: [`Sales by Product — ${name}`, "Total Sold", "Revenue"],
      body: rows.map((r) => [
        r.product_name || "—",
        String(r.quantity),
        formatCurrency(r.revenue),
      ]),
    }));
  }
  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>{user.role === "store_manager" ? "Sales Report" : "Reports"}</h1>
          <p>Product-level sales and inventory information.</p>
        </div>
        {!loading && (
          <PdfExportButton
            title="Sales Report"
            fileName={`${user.role}-sales-report`}
            getSections={getSections}
          />
        )}
      </div>
      {loading ? (
        <div className="loading-row">Loading report...</div>
      ) : (
        <>
          <div className="stat-grid cols-3">
            <StatCard
              icon={ReceiptText}
              label="Total Transactions"
              value={summary.count || 0}
            />
            <StatCard
              icon={PackageSearch}
              label="Total Quantity Sold"
              value={summary.total_quantity || 0}
              tone="info"
            />
            <StatCard
              icon={ReceiptText}
              label="Total Revenue"
              value={formatCurrency(summary.total_revenue || 0)}
              tone="success"
            />
          </div>
          <Section
            title="Sales by Product"
            icon={ReceiptText}
            open={open.sales}
            onToggle={() => setOpen({ ...open, sales: !open.sales })}
          >
            {salesGroups.map(([name, rows]) => (
              <div key={name}>
                <h3>{user.role === "administrator" ? name : null}</h3>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="col-text">Product</th>
                        <th className="col-num">Total Sold</th>
                        <th className="col-num">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.product_id}>
                          <td className="col-text">{r.product_name}</td>
                          <td className="col-num">{r.quantity}</td>
                          <td className="col-num">{formatCurrency(r.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </Section>
          <Section
            title="Inventory Value"
            icon={PackageSearch}
            open={open.inventory}
            onToggle={() => setOpen({ ...open, inventory: !open.inventory })}
          >
            {inventoryGroups.map(([name, rows]) => (
              <div key={name} className="report-location-group">
                {user.role === "administrator" && <h3>{name}</h3>}
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="col-text">Product</th>
                        <th className="col-num">Quantity</th>
                        <th className="col-num">Unit Price</th>
                        <th className="col-num">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr
                          key={`${r.product_id}-${r.warehouse_id || r.store_id}`}
                        >
                          <td className="col-text">{r.product_name}</td>
                          <td className="col-num">{r.quantity}</td>
                          <td className="col-num">{formatCurrency(r.unit_price)}</td>
                          <td className="col-num">{formatCurrency(r.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </Section>
        </>
      )}
    </Layout>
  );
}
