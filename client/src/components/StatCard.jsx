import { Link } from "react-router-dom";
export default function StatCard({
  icon: Icon,
  label,
  value,
  tone = "primary",
  detail,
  to,
}) {
  const content = (
    <>
      <div className="stat-card-icon">
        <Icon size={19} strokeWidth={2} />
      </div>
      <div>
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
        {detail && <p className="stat-sub">{detail}</p>}
      </div>
    </>
  );
  return to ? (
    <Link
      className={`stat-card stat-card-${tone} stat-card-link`}
      to={to}
      aria-label={`${label}: ${value}`}
    >
      {content}
    </Link>
  ) : (
    <article className={`stat-card stat-card-${tone}`}>{content}</article>
  );
}
