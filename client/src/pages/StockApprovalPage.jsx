import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function StockApprovalPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    setLoading(true);
    try {
      const response = await api.get('/stock-requests');
      setRequests(response.data.requests);
    } catch (err) {
      setError('Failed to load requests.');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(request_id) {
    setError('');
    setSuccess('');
    try {
      const response = await api.put(`/stock-requests/${request_id}/approve`);
      setSuccess(`Approved and dispatched. Remaining warehouse quantity: ${response.data.remaining_warehouse_quantity}.`);
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve request.');
    }
  }

  async function handleReject(request_id) {
    setError('');
    setSuccess('');
    try {
      await api.put(`/stock-requests/${request_id}/reject`);
      setSuccess('Request rejected.');
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject request.');
    }
  }

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const otherRequests = requests.filter((r) => r.status !== 'pending');

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif', maxWidth: 900, margin: '0 auto' }}>
      <Link to="/warehouse">&larr; Back to Dashboard</Link>
      <h1>Stock Transfer / Approval</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}

      <h3>Pending Requests</h3>
      {loading ? (
        <p>Loading...</p>
      ) : pendingRequests.length === 0 ? (
        <p>No pending requests.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 32 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #333', textAlign: 'left' }}>
              <th style={{ padding: 8 }}>ID</th>
              <th style={{ padding: 8 }}>Store</th>
              <th style={{ padding: 8 }}>Product</th>
              <th style={{ padding: 8 }}>Quantity</th>
              <th style={{ padding: 8 }}>Date</th>
              <th style={{ padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingRequests.map((r) => (
              <tr key={r.request_id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: 8 }}>{r.request_id}</td>
                <td style={{ padding: 8 }}>Store {r.store_id}</td>
                <td style={{ padding: 8 }}>{r.Product?.product_name}</td>
                <td style={{ padding: 8 }}>{r.quantity}</td>
                <td style={{ padding: 8 }}>{new Date(r.request_date).toLocaleDateString()}</td>
                <td style={{ padding: 8 }}>
                  <button onClick={() => handleApprove(r.request_id)} style={{ marginRight: 8, background: '#28a745', color: 'white', border: 'none', padding: '4px 12px', borderRadius: 4 }}>
                    Approve
                  </button>
                  <button onClick={() => handleReject(r.request_id)} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '4px 12px', borderRadius: 4 }}>
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Request History</h3>
      {otherRequests.length === 0 ? (
        <p>No history yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #333', textAlign: 'left' }}>
              <th style={{ padding: 8 }}>ID</th>
              <th style={{ padding: 8 }}>Store</th>
              <th style={{ padding: 8 }}>Product</th>
              <th style={{ padding: 8 }}>Quantity</th>
              <th style={{ padding: 8 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {otherRequests.map((r) => (
              <tr key={r.request_id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: 8 }}>{r.request_id}</td>
                <td style={{ padding: 8 }}>Store {r.store_id}</td>
                <td style={{ padding: 8 }}>{r.Product?.product_name}</td>
                <td style={{ padding: 8 }}>{r.quantity}</td>
                <td style={{ padding: 8 }}>{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}