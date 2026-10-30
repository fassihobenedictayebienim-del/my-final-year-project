import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import CollapsibleSection from "../components/CollapsibleSection";
import Layout from "../components/Layout";
import { useToast } from "../context/ToastContext";
import api from "../services/api";
import { EmptyState, TableSkeleton } from "../components/PageStates";

export default function StockApprovalPage() {
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const pendingRef = useRef(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  async function load() {
    setLoading(true);
    try {
      setRequests((await api.get("/stock-requests")).data.requests);
    } catch {
      showToast("Failed to load requests.", "error");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (!loading && searchParams.get("status") === "pending")
      pendingRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }, [loading, searchParams]);
  async function act(id, action) {
    if (action === "reject" && !window.confirm("Reject this stock request?"))
      return;
    try {
      const response = await api.put(`/stock-requests/${id}/${action}`);
      showToast(
        action === "approve"
          ? `Stock dispatched. Remaining warehouse quantity: ${response.data.remaining_warehouse_quantity}.`
          : "Request rejected.",
      );
      load();
    } catch (error) {
      showToast(
        error.response?.data?.message || "Unable to update request.",
        "error",
      );
    }
  }
  const pending = requests.filter((r) => r.status === "pending");
  const history = requests.filter((r) => r.status !== "pending");
  const table = (rows, actions) => (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th className="col-text">ID</th>
            <th className="col-text">Store</th>
            <th className="col-text">Product</th>
            <th className="col-num">Quantity</th>
            <th className="col-text">Date</th>
            <th className="col-center">Status</th>
            {actions && <th className="col-center">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.request_id}>
              <td className="col-text">{r.request_id}</td>
              <td className="col-text">Store {r.store_id}</td>
              <td className="col-text">{r.Product?.product_name}</td>
              <td className="col-num">{r.quantity}</td>
              <td className="col-text">{new Date(r.request_date).toLocaleDateString()}</td>
              <td className="col-center">
                <span className={`badge badge-${r.status}`}>{r.status}</span>
              </td>
              {actions && (
                <td className="col-center">
                  <div className="action-buttons">
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => act(r.request_id, "approve")}
                    >
                      Approve
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => act(r.request_id, "reject")}
                    >
                      Reject
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Stock Transfer / Approval</h1>
          <p>Review and act on product stock requests from stores.</p>
        </div>
      </div>
      <section className="report-section" ref={pendingRef} tabIndex="-1">
        <div className="report-section-content">
          <h3>Pending Requests</h3>
          {loading ? (
            <TableSkeleton columns={7} />
          ) : pending.length ? (
            table(pending, true)
          ) : (
            <EmptyState
              title="No pending requests"
              detail="New store requests will appear here for review."
            />
          )}
        </div>
      </section>
      <CollapsibleSection
        title={`Request History (${history.length})`}
        open={showHistory}
        onToggle={() => setShowHistory(!showHistory)}
      >
        {history.length ? (
          table(history, false)
        ) : (
          <EmptyState
            title="No request history yet"
            detail="Completed and rejected requests will appear here."
          />
        )}
      </CollapsibleSection>
    </Layout>
  );
}
