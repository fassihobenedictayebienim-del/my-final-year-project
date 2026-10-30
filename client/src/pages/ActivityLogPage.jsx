import { Fragment, useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import Layout from "../components/Layout";
import PdfExportButton from "../components/PdfExportButton";
import { EmptyState, TableSkeleton } from "../components/PageStates";
import api from "../services/api";

const ACTION_COLORS = {
  LOGIN: "badge-fulfilled",
  PRODUCT_CREATED: "badge-approved",
  PRODUCT_UPDATED: "badge-pending",
  PRODUCT_DELETED: "badge-rejected",
  VARIANT_ADDED: "badge-approved",
  VARIANT_DELETED: "badge-rejected",
  SHIPMENT_RECORDED: "badge-approved",
  SHIPMENT_RECEIVED: "badge-approved",
  STOCK_REQUEST_CREATED: "badge-pending",
  REQUEST_APPROVED: "badge-approved",
  REQUEST_REJECTED: "badge-rejected",
  RECEIPT_CONFIRMED: "badge-fulfilled",
  SALE_RECORDED: "badge-approved",
  USER_CREATED: "badge-fulfilled",
  USER_UPDATED: "badge-pending",
  USER_DELETED: "badge-rejected",
  USER_REACTIVATED: "badge-fulfilled",
  STORE_REMOVED: "badge-rejected",
  STORE_REACTIVATED: "badge-fulfilled",
  SHIPMENT_BATCH_RECORDED: "badge-approved",
  STOCK_RECEIVED: "badge-approved",
  PASSWORD_RESET: "badge-rejected",
  PASSWORD_CHANGED: "badge-pending",
  LOCATION_UPDATED: "badge-pending",
};

export default function ActivityLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateError, setDateError] = useState("");
  const [expandedDate, setExpandedDate] = useState(null);

  useEffect(() => {
    api
      .get("/activity-logs")
      .then((res) => setLogs(res.data.logs))
      .catch(() => setError("Failed to load activity log."))
      .finally(() => setLoading(false));
  }, []);

  const filteredLogs = logs.filter((log) => {
    const d = new Date(log.created_at);
    if (startDate && d < new Date(`${startDate}T00:00:00`)) return false;
    if (endDate && d > new Date(endDate + "T23:59:59")) return false;
    return true;
  });

  function clearFilter() {
    setStartDate("");
    setEndDate("");
    setDateError("");
  }

  function groupByDate(items) {
    const byDate = {};
    for (const log of items) {
      const dateKey = new Date(log.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (!byDate[dateKey]) byDate[dateKey] = [];
      byDate[dateKey].push(log);
    }
    return Object.entries(byDate).sort(
      (a, b) => new Date(b[1][0].created_at) - new Date(a[1][0].created_at),
    );
  }
  const logsByDate = groupByDate(filteredLogs);
  function updateStartDate(value) {
    setStartDate(value);
    setDateError(
      value && endDate && value > endDate
        ? "Start date must not be after end date."
        : "",
    );
  }

  function updateEndDate(value) {
    setEndDate(value);
    setDateError(
      startDate && value && startDate > value
        ? "End date must not be before start date."
        : "",
    );
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Activity Log</h1>
          <p>
            A record of key actions taken across the system (most recent 200).
          </p>
        </div>
        {!loading && (
          <PdfExportButton
            title="Activity Log"
            fileName="activity-log"
            getSections={async ({ start_date, end_date }) => [
              {
                head: ["Date & Time", "User", "Role", "Action", "Details"],
                body: logs
                  .filter(
                    (log) =>
                      (!start_date ||
                        new Date(log.created_at) >= new Date(start_date)) &&
                      (!end_date ||
                        new Date(log.created_at) <=
                          new Date(`${end_date}T23:59:59`)),
                  )
                  .map((log) => [
                    new Date(log.created_at).toLocaleString(),
                    log.user_name || "—",
                    log.user_role || "—",
                    log.action.replace(/_/g, " "),
                    log.details || "—",
                  ]),
              },
            ]}
          />
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div
        className="form-row"
        style={{ alignItems: "flex-end", marginBottom: 16 }}
      >
        <div>
          <label className="form-label" htmlFor="activity-log-start-date">
            From
          </label>
          <input
            type="date"
            className="form-input"
            id="activity-log-start-date"
            value={startDate}
            max={endDate || undefined}
            onChange={(e) => updateStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="form-label" htmlFor="activity-log-end-date">
            To
          </label>
          <input
            type="date"
            className="form-input"
            id="activity-log-end-date"
            value={endDate}
            min={startDate || undefined}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => updateEndDate(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn btn-sm btn-secondary"
          onClick={clearFilter}
        >
          Clear
        </button>
        <span
          style={{
            fontSize: 13,
            color: "var(--color-text-muted)",
            alignSelf: "center",
          }}
        >
          {filteredLogs.length} of {logs.length} shown
        </span>
      </div>
      {dateError && <p className="form-error">{dateError}</p>}

      {loading ? (
        <TableSkeleton columns={3} rows={6} />
      ) : logsByDate.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={
            logs.length === 0
              ? "No activity recorded yet"
              : "No activity in this date range"
          }
        />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th className="col-text">Date</th>
                <th className="col-num">Events</th>
                <th className="col-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {logsByDate.map(([dateLabel, dayLogs]) => (
                <Fragment key={dateLabel}>
                  <tr>
                    <td className="col-text">{dateLabel}</td>
                    <td className="col-num">
                      {dayLogs.length} event{dayLogs.length !== 1 ? "s" : ""}
                    </td>
                    <td className="col-center">
                      <button
                        className="btn btn-sm"
                        onClick={() =>
                          setExpandedDate(
                            expandedDate === dateLabel ? null : dateLabel,
                          )
                        }
                      >
                        {expandedDate === dateLabel ? "Hide" : "View Events"}
                      </button>
                    </td>
                  </tr>
                  {expandedDate === dateLabel && (
                    <tr>
                      <td
                        colSpan={3}
                        style={{ background: "var(--color-bg)", padding: 16 }}
                      >
                        <div className="table-wrap">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th className="col-text">Time</th>
                                <th className="col-text">User</th>
                                <th className="col-text">Role</th>
                                <th className="col-center">Action</th>
                                <th className="col-text">Details</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dayLogs.map((log) => (
                                <tr key={log.log_id}>
                                  <td className="col-text" style={{ whiteSpace: "nowrap" }}>
                                    {new Date(
                                      log.created_at,
                                    ).toLocaleTimeString()}
                                  </td>
                                  <td className="col-text">{log.user_name || "—"}</td>
                                  <td className="col-text">{log.user_role || "—"}</td>
                                  <td className="col-center">
                                    <span
                                      className={`badge ${ACTION_COLORS[log.action] || "badge-fulfilled"}`}
                                    >
                                      {log.action.replace(/_/g, " ")}
                                    </span>
                                  </td>
                                  <td className="col-text">{log.details}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
