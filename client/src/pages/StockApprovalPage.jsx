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

  useEffect(() => { fetchRequests(); }, []);

  async function fetchRequests() {
    setLoading(true);
    try {
      const response = await api.get('/stock-requests');
      setRequests(response.data.requests);
    } catch (err) {
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

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Stock Transfer / Approval</h1>
          <p>Review and act on stock requests from the stores.</p>
        </div>
      </div>

      <h3>Pending Requests</h3>
      {loading ? <p>Loading...</p> : pendingRequests.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>No pending requests.</p>
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
      <div className="form-row" style={{ alignItems: 'center', marginBottom: 16 }}>
        <label style={{ fontSize: 13 }}>From <input type="date" className="form-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
        <label style={{ fontSize: 13 }}>To <input type="date" className="form-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
        <button type="button" className="btn btn-sm" onClick={clearFilter}>Clear</button>
        <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{filteredHistory.length} of {otherRequests.length} shown</span>
      </div>

      {filteredHistory.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>{otherRequests.length === 0 ? 'No history yet.' : 'No history in this date range.'}</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Store</th><th>Product</th><th>Colour</th><th>Size</th><th>Quantity</th><th>Status</th></tr></thead>
            <tbody>
              {filteredHistory.map((r) => (
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
        </div>
      )}
    </Layout>
  );
}