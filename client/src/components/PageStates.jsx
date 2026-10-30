import { Inbox, LoaderCircle } from "lucide-react";

export function EmptyState({
  icon: Icon = Inbox,
  title = "Nothing to show yet",
  detail,
}) {
  return (
    <div className="empty-state">
      <Icon className="empty-state-icon" size={30} aria-hidden="true" />
      <strong>{title}</strong>
      {detail && <span>{detail}</span>}
    </div>
  );
}

export function TableSkeleton({ rows = 4, columns = 5 }) {
  return (
    <div className="table-skeleton" role="status" aria-label="Loading data">
      {Array.from({ length: rows }, (_, row) => (
        <div className="skeleton-row" key={row}>
          {Array.from({ length: columns }, (_, column) => (
            <span className="skeleton-cell" key={column} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SubmittingButton({
  submitting,
  children,
  className = "btn btn-primary",
  ...props
}) {
  return (
    <button
      className={className}
      disabled={submitting || props.disabled}
      {...props}
    >
      {submitting && (
        <LoaderCircle size={15} className="spin-icon" aria-hidden="true" />
      )}
      {children}
    </button>
  );
}
