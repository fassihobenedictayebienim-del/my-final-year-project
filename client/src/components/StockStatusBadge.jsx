export default function StockStatusBadge({ status, lowLabel = "Low stock" }) {
  const normalized = status === "out" ? "out" : status === "low" ? "low" : "ok";
  const label =
    normalized === "out"
      ? "Out of stock"
      : normalized === "low"
        ? lowLabel
        : "In stock";
  return <span className={`stock-badge stock-${normalized}`}>{label}</span>;
}
