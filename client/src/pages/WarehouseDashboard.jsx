import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Boxes,
  CircleAlert,
  CircleDollarSign,
  ClipboardList,
} from "lucide-react";
import Layout from "../components/Layout";
import StockStatusBadge from "../components/StockStatusBadge";
import StatCard from "../components/StatCard";
import StatusPie from "../components/StatusPie";
import api from "../services/api";
import { formatCurrency } from "../utils/currency";
import { chartTooltipProps } from "../utils/chartTooltip";
export default function WarehouseDashboard() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get("/dashboard/warehouse").then((r) => setData(r.data));
  }, []);
  if (!data)
    return (
      <Layout>
        <div className="loading-row">Loading dashboard...</div>
      </Layout>
    );
  const {
    kpis,
    warehouse_low_stock_products: alerts = [],
    stock_status,
  } = data;
  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Warehouse Manager Dashboard</h1>
          <p>Warehouse stock and store transfer overview.</p>
        </div>
      </div>
      <div className="stat-grid cols-3">
        <StatCard
          icon={Boxes}
          label="Total Warehouse Stock"
          value={kpis.total_warehouse_stock}
        />
        <StatCard
          icon={CircleDollarSign}
          label="Inventory Value"
          value={formatCurrency(kpis.warehouse_inventory_value)}
          tone="success"
        />
        <StatCard
          icon={ClipboardList}
          label="Pending Store Requests"
          value={kpis.pending_store_requests}
          tone="warning"
          to="/warehouse/requests?status=pending"
        />
        <StatCard
          icon={CircleAlert}
          label="Low-Stock Products"
          value={kpis.products_below_reorder}
          tone={kpis.products_below_reorder ? "danger" : "success"}
          to="/warehouse/products?lowStock=1"
        />
      </div>
      <section className="dashboard-chart-grid">
        <div className="chart-card">
          <h3>Warehouse Movement</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.stock_movement_trend}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
              />
              <XAxis dataKey="date" tickFormatter={(date) => date.slice(5)} />
              <YAxis />
              <Tooltip {...chartTooltipProps} />
              <Line
                type="monotone"
                dataKey="received"
                name="Received"
                stroke="var(--color-success)"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="dispatched"
                name="Dispatched"
                stroke="var(--color-primary)"
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <h3>Stock Status</h3>
          <StatusPie
            inStock={stock_status.in_stock}
            lowStock={stock_status.low_stock}
            outOfStock={stock_status.out_of_stock}
          />
        </div>
      </section>
      <h3>Products Needing Attention</h3>
      {alerts.length ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th className="col-text">Product</th>
                <th className="col-num">Quantity</th>
                <th className="col-num">Reorder Level</th>
                <th className="col-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((row) => (
                <tr key={row.product_id}>
                  <td className="col-text">
                    <Link
                      className="table-link"
                      to={`/warehouse/products?product=${encodeURIComponent(row.product_id)}`}
                    >
                      {row.product_name}
                    </Link>
                  </td>
                  <td className="col-num">{row.total_quantity}</td>
                  <td className="col-num">{row.reorder_level}</td>
                  <td className="col-center"><StockStatusBadge status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          No product-level stock problems right now.
        </div>
      )}
    </Layout>
  );
}
