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
  ShoppingBag,
  Store,
  TrendingUp,
} from "lucide-react";
import Layout from "../components/Layout";
import StatCard from "../components/StatCard";
import StatusPie from "../components/StatusPie";
import api from "../services/api";
import { formatCurrency } from "../utils/currency";
import { chartTooltipProps } from "../utils/chartTooltip";
export default function AdminDashboard() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get("/dashboard/admin").then((r) => setData(r.data));
  }, []);
  if (!data)
    return (
      <Layout>
        <div className="loading-row">Loading dashboard...</div>
      </Layout>
    );
  const { kpis, stock_status } = data;
  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Administrator Dashboard</h1>
          <p>System-wide overview across all locations.</p>
        </div>
      </div>
      <div className="stat-grid cols-3">
        <StatCard
          icon={Boxes}
          label="Total Products"
          value={kpis.total_products}
        />
        <StatCard
          icon={TrendingUp}
          label="Total Inventory Quantity"
          value={kpis.total_inventory_quantity}
          tone="info"
        />
        <StatCard
          icon={CircleDollarSign}
          label="Total Inventory Value"
          value={formatCurrency(kpis.total_inventory_value)}
          tone="success"
        />
        <StatCard
          icon={ShoppingBag}
          label="Total Sales"
          value={formatCurrency(kpis.total_sales)}
        />
        <StatCard
          icon={Store}
          label="Number of Stores"
          value={kpis.number_of_stores}
          tone="info"
        />
        <StatCard
          icon={CircleAlert}
          label="Low-Stock Products"
          value={kpis.low_stock_count}
          tone={kpis.low_stock_count ? "danger" : "success"}
        />
      </div>
      <section className="dashboard-chart-grid">
        <div className="chart-card">
          <h3>Overall Sales Trend</h3>
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
          <h3>Sales by Store</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.sales_by_store}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
              />
              <XAxis dataKey="store_name" />
              <YAxis />
              <Tooltip
                {...chartTooltipProps}
                formatter={(value) => formatCurrency(value)}
              />
              <Bar
                dataKey="revenue"
                name="Revenue"
                fill="var(--color-primary)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <h3>Inventory by Location</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.inventory_by_location}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
              />
              <XAxis dataKey="location_name" />
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
        <div className="chart-card">
          <h3>Stock Status</h3>
          <StatusPie
            inStock={stock_status.in_stock}
            lowStock={stock_status.low_stock}
            outOfStock={stock_status.out_of_stock}
          />
        </div>
      </section>
    </Layout>
  );
}
