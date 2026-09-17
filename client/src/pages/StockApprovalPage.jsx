import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export default function StockApprovalPage() {
  const { showToast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedDate, setExpandedDate] = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- Load requests once when the page opens.
  useEffect(() => { fetchRequests(); }, []);

  async function fetchRequests() {
    setLoading(true);
    try {
      const response = await api.get('/stock-requests');
      setRequests(response.data.requests);
    } catch (_err) {
      showToast('Failed to load requests.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(request_id) {
    try {
      const response = await api.put(`/stock-requests/${request_id}/approve`);
      showToast(`Stock transfer completed. Remaining warehouse quantity: ${response.data.remaining_warehouse_quantity}.`);
      fetchRequests();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to approve request.', 'error');
    }
  }

  async function handleReject(request_id) {
    try {
      await api.put(`/stock-requests/${request_id}/reject`);
      showToast('Request rejected.');
      fetchRequests();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reject request.', 'error');
    }
  }

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const otherRequests = requests.filter((r) => r.status !== 'pending');

  const filteredHistory = otherRequests.filter((r) => {
    const d = new Date(r.request_date);
    if (startDate && d < new Date(startDate)) return false;
    if (endDate && d > new Date(endDate + 'T23:59:59')) return false;
    return true;
  });

  function clearFilter() { setStartDate(''); setEndDate(''); }

  function groupByDate(items) {
    const byDate = {};
    for (const r of items) {
      const dateKey = new Date(r.request_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      if (!byDate[dateKey]) byDate[dateKey] = [];
      byDate[dateKey].push(r);
    }
    return Object.entries(byDate).sort((a, b) => new Date(b[1][0].request_date) - new Date(a[1][0].request_date));
  }
  const historyByDate = groupByDate(filteredHistory);

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Stock Transfer / Approval</h1>
          <p>Review and act on stock requests from the stores.</p>
        </div>
      </div>

      <h3>Pending Requests</h3>
      {loading ? (
        <div className="loading-row"><span className="spinner" style={{ borderTopColor: 'var(--color-primary)', borderColor: 'var(--color-border)' }} /> Loading requests...</div>
      ) : pendingRequests.length === 0 ? (
        <div className="empty-state" style={{ marginBottom: 24 }}><span className="empty-state-icon">✅</span>No pending requests.</div>
      ) : (
        <div className="table-wrap" style={{ marginBottom: 24 }}>
          <table className="data-table">
            <thead><tr><th>ID</th><th>Store</th><th>Product</th><th>Colour</th><th>Size</th><th>Quantity</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {pendingRequests.map((r) => (
                <tr key={r.request_id}>
                  <td>{r.request_id}</td>
                  <td>Store {r.store_id}</td>
                  <td>{r.ProductVariant?.Product?.product_name}</td>
                  <td>{r.ProductVariant?.color}</td>
                  <td>{r.ProductVariant?.size}</td>
                  <td>{r.quantity}</td>
                  <td>{new Date(r.request_date).toLocaleDateString()}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn btn-sm btn-success" onClick={() => handleApprove(r.request_id)}>Approve</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleReject(r.request_id)}>Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3>Request History</h3>
      <div className="form-row" style={{ alignItems: 'flex-end', marginBottom: 16 }}>
        <div><label className="form-label">From</label><input type="date" className="form-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
        <div><label className="form-label">To</label><input type="date" className="form-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
        <button type="button" className="btn btn-sm btn-secondary" onClick={clearFilter}>Clear</button>
        <span style={{ fontSize: 13, color: 'var(--color-text-muted)', alignSelf: 'center' }}>{filteredHistory.length} of {otherRequests.length} shown</span>
      </div>

      {historyByDate.length === 0 ? (
        <div className="empty-state"><span className="empty-state-icon">📋</span>{otherRequests.length === 0 ? 'No history yet.' : 'No history in this date range.'}</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Date</th><th>Requests</th><th>Action</th></tr></thead>
            <tbody>
              {historyByDate.map(([dateLabel, dayRequests]) => (
                <>
                  <tr key={dateLabel}>
                    <td>{dateLabel}</td>
                    <td>{dayRequests.length} request{dayRequests.length !== 1 ? 's' : ''}</td>
                    <td>
                      <button className="btn btn-sm" onClick={() => setExpandedDate(expandedDate === dateLabel ? null : dateLabel)}>
                        {expandedDate === dateLabel ? 'Hide' : 'View Requests'}
                      </button>
                    </td>
                  </tr>
                  {expandedDate === dateLabel && (
                    <tr>
                      <td colSpan={3} style={{ background: 'var(--color-bg)', padding: 16 }}>
                        <table className="data-table">
                          <thead><tr><th>ID</th><th>Store</th><th>Product</th><th>Colour</th><th>Size</th><th>Quantity</th><th>Status</th></tr></thead>
                          <tbody>
                            {dayRequests.map((r) => (
                              <tr key={r.request_id}>
                                <td>{r.request_id}</td>
                                <td>Store {r.store_id}</td>
                                <td>{r.ProductVariant?.Product?.product_name}</td>
                                <td>{r.ProductVariant?.color}</td>
                                <td>{r.ProductVariant?.size}</td>
                                <td>{r.quantity}</td>
                                <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
