import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { chartTooltipProps } from '../utils/chartTooltip';

const COLORS = { 'In Stock': '#16a34a', 'Low Stock': '#f59e0b', 'Out of Stock': '#dc2626' };

export default function StatusPie({ inStock, lowStock, outOfStock }) {
  const data = [
    { name: 'In Stock', value: inStock },
    { name: 'Low Stock', value: lowStock },
    { name: 'Out of Stock', value: outOfStock },
  ].filter((d) => d.value > 0);

  if (data.length === 0) return <div className="chart-empty">No inventory data yet.</div>;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
          {data.map((entry) => <Cell key={entry.name} fill={COLORS[entry.name]} />)}
        </Pie>
        <Tooltip {...chartTooltipProps} />
        <Legend wrapperStyle={{ fontSize: 12.5 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
