import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
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
  ShoppingBag,
} from "lucide-react";
import Layout from "../components/Layout";
import StockStatusBadge from "../components/StockStatusBadge";
import StatCard from "../components/StatCard";
import StatusPie from "../components/StatusPie";
import api from "../services/api";
import { formatCurrency } from "../utils/currency";
import { chartTooltipProps } from "../utils/chartTooltip";
export default function StoreDashboard() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get("/dashboard/store").then((r) => setData(r.data));
  }, []);
  if (!data)
    return (
      <Layout>
        <div className="loading-row">Loading dashboard...</div>
      </Layout>
    );
  const { kpis, products_below_reorder: alerts = [], stock_status } = data;
  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Store Manager Dashboard</h1>
          <p>Your store’s product stock and sales overview.</p>
        </div>
      </div>
      <div className="stat-grid cols-3">
        <StatCard
          icon={Boxes}
          label="Current Store Stock"
          value={kpis.current_store_stock}
        />
        <StatCard
          icon={ShoppingBag}
          label="Items Sold Today"
          value={kpis.todays_sales_count}
          tone="info"
        />
        <StatCard
          icon={CircleDollarSign}
          label="Revenue Today"
          value={formatCurrency(kpis.todays_revenue)}
          tone="success"
        />
        <StatCard
          icon={ClipboardList}
          label="Pending Requests"
          value={kpis.pending_stock_requests}
          tone="warning"
        />
        <StatCard
          icon={CircleAlert}
          label="Low-Stock Products"
          value={kpis.low_stock_products_count}
          tone={kpis.low_stock_products_count ? "danger" : "success"}
        />
      </div>
      <section className="dashboard-chart-grid">
        <div className="chart-card">
          <h3>Sales Trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.sales_trend}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
              />
              <XAxis dataKey="date" tickFormatter={(date) => date.slice(5)} />
              <YAxis />
              <Tooltip
                {...chartTooltipProps}
                formatter={(value) => formatCurrency(value)}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                name="Revenue"
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
        <div className="chart-card">
          <h3>Top Selling Products</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.top_selling_products} layout="vertical">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
              />
              <XAxis type="number" />
              <YAxis dataKey="product_name" type="category" width={100} />
              <Tooltip {...chartTooltipProps} />
              <Bar
                dataKey="quantity_sold"
                name="Quantity Sold"
                fill="var(--color-primary)"
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <h3>Current Stock by Product</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.current_stock_by_product}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
              />
              <XAxis dataKey="product_name" />
              <YAxis />
              <Tooltip {...chartTooltipProps} />
              <Bar
                dataKey="quantity"
                name="Quantity"
                fill="var(--color-success)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
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
                  <td className="col-text">{row.product_name}</td>
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
