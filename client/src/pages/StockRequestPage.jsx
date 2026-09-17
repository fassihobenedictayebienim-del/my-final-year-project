import { Fragment, useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export default function StockRequestPage() {
  const { showToast } = useToast();

  const [warehouseStock, setWarehouseStock] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [expandedProduct, setExpandedProduct] = useState(null);
  const [requestQty, setRequestQty] = useState({});

  const [expandedDate, setExpandedDate] = useState(null);

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Load store data once when the page opens.
  }, []);

  async function fetchData() {
    setLoading(true);

    try {
      const [stockRes, requestsRes] = await Promise.all([
        api.get('/inventory/warehouse-stock'),
        api.get('/stock-requests'),
      ]);

      setWarehouseStock(stockRes.data.inventory || []);

      const loadedRequests = requestsRes.data.requests || [];

      setRequests(loadedRequests);

      // Automatically expand the date of the latest request
      if (loadedRequests.length > 0) {
        const latestDate = new Date(
          loadedRequests[0].request_date
        ).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        setExpandedDate(latestDate);
      }
    } catch (_err) {
      showToast('Failed to load data.', 'error');
    } finally {
      setLoading(false);
    }
  }

  // --------------------------------------------------
  // GROUP WAREHOUSE STOCK INTO PRODUCTS
  // --------------------------------------------------

  function groupProducts() {
    const byProduct = {};

    for (const row of warehouseStock) {
      const pid = row.ProductVariant.product_id;

      if (!byProduct[pid]) {
        byProduct[pid] = {
          product_id: pid,
          product_name:
            row.ProductVariant.Product.product_name,
          total: 0,
          variants: [],
        };
      }

      byProduct[pid].total += row.quantity;

      byProduct[pid].variants.push({
        variant_id: row.variant_id,
        color: row.ProductVariant.color,
        size: row.ProductVariant.size,
        quantity: row.quantity,
      });
    }

    return Object.values(byProduct).map((p) => {
      // This is a product-level row, so its status must match the total
      // displayed beside it. Variant availability remains visible after
      // expanding the product, where unavailable variants are disabled.
      const status = p.total === 0
        ? 'out'
        : p.total <= 5
          ? 'low'
          : 'ok';

      return {
        ...p,
        status,
      };
    });
  }

  const products = groupProducts();

  // --------------------------------------------------
  // STOCK STATUS BADGE
  // --------------------------------------------------

  function statusBadge(status) {
    if (status === 'out') {
      return (
        <span className="stock-badge out-of-stock">
          🔴 Out of Stock
        </span>
      );
    }

    if (status === 'low') {
      return (
        <span className="stock-badge low-stock">
          🟠 Low Stock
        </span>
      );
    }

    return (
      <span className="stock-badge in-stock">
        🟢 In Stock
      </span>
    );
  }

  // --------------------------------------------------
  // SUBMIT STOCK REQUEST
  // --------------------------------------------------

  async function handleSubmitRequest(variant_id) {
    const qty = requestQty[variant_id];

    if (!qty || Number(qty) <= 0) {
      showToast(
        'Enter a quantity greater than 0.',
        'error'
      );
      return;
    }

    try {
      await api.post('/stock-requests', {
        variant_id,
        quantity: qty,
      });

      showToast('Stock request submitted.');

      // Clear the quantity input
      setRequestQty((prev) => ({
        ...prev,
        [variant_id]: '',
      }));

      // Reload requests
      await fetchData();
    } catch (err) {
      showToast(
        err.response?.data?.message ||
          'Failed to submit request.',
        'error'
      );
    }
  }

  // --------------------------------------------------
  // CANCEL STOCK REQUEST
  // --------------------------------------------------

  async function handleCancelRequest(request_id) {
    const confirmed = window.confirm(
      'Are you sure you want to cancel this stock request? This action cannot be undone.'
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.put(
        `/stock-requests/${request_id}/cancel`
      );

      showToast('Stock request cancelled.');

      await fetchData();
    } catch (err) {
      showToast(
        err.response?.data?.message ||
          'Failed to cancel the request.',
        'error'
      );
    }
  }

  // --------------------------------------------------
  // CONFIRM RECEIPT
  // --------------------------------------------------

  async function handleConfirmReceipt(request_id) {
    try {
      await api.put(
        `/stock-requests/${request_id}/confirm-receipt`
      );

      showToast('Stock transfer completed.');

      await fetchData();
    } catch (err) {
      showToast(
        err.response?.data?.message ||
          'Failed to confirm receipt.',
        'error'
      );
    }
  }

  // --------------------------------------------------
  // GROUP REQUESTS BY DATE
  // --------------------------------------------------

  function groupRequestsByDate() {
    const byDate = {};

    for (const r of requests) {
      const dateKey = new Date(
        r.request_date
      ).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      if (!byDate[dateKey]) {
        byDate[dateKey] = [];
      }

      byDate[dateKey].push(r);
    }

    return Object.entries(byDate).sort(
      (a, b) =>
        new Date(b[1][0].request_date) -
        new Date(a[1][0].request_date)
    );
  }

  const requestsByDate = groupRequestsByDate();

  // --------------------------------------------------
  // PAGE
  // --------------------------------------------------

  return (
    <Layout>

      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <h1>Stock Request</h1>

          <p>
            Request stock from the warehouse and track
            your past requests.
          </p>
        </div>
      </div>

      {/* ============================================
          REQUEST STOCK
      ============================================ */}

      <h3>Request Stock</h3>

      {loading ? (
        <div className="loading-row">
          <span
            className="spinner"
            style={{
              borderTopColor:
                'var(--color-primary)',
              borderColor:
                'var(--color-border)',
            }}
          />

          Loading...
        </div>
      ) : products.length === 0 ? (
        <div
          className="empty-state"
          style={{ marginBottom: 24 }}
        >
          <span className="empty-state-icon">
            📦
          </span>

          No stock currently at the warehouse.
        </div>
      ) : (
        <div
          className="table-wrap"
          style={{ marginBottom: 24 }}
        >
          <table className="data-table">

            <thead>
              <tr>
                <th>Product ID</th>
                <th>Product Name</th>
                <th>Total in Warehouse</th>
                <th>Product Availability</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>

              {products.map((p) => (
                <Fragment key={p.product_id}>

                  {/* PRODUCT ROW */}
                  <tr key={p.product_id}>

                    <td className="mono">
                      {p.product_id}
                    </td>

                    <td>
                      {p.product_name}
                    </td>

                    <td>
                      {p.total}
                    </td>

                    <td>
                      {statusBadge(p.status)}
                    </td>

                    <td>
                      <button
                        className="btn btn-sm"
                        onClick={() =>
                          setExpandedProduct(
                            expandedProduct ===
                              p.product_id
                              ? null
                              : p.product_id
                          )
                        }
                      >
                        {expandedProduct ===
                        p.product_id
                          ? 'Hide Variants'
                          : 'View Variants'}
                      </button>
                    </td>

                  </tr>

                  {/* VARIANTS */}
                  {expandedProduct ===
                    p.product_id && (
                    <tr>

                      <td
                        colSpan={5}
                        style={{
                          background:
                            'var(--color-bg)',
                          padding: 16,
                        }}
                      >

                        <p
                          style={{
                            margin:
                              '0 0 10px',
                            fontWeight: 700,
                            fontSize: 13.5,
                          }}
                        >
                          {p.product_name}
                        </p>

                        <table className="data-table">

                          <thead>
                            <tr>
                              <th>Colour</th>
                              <th>Size</th>
                              <th>
                                Warehouse Stock
                              </th>
                              <th>
                                Quantity to Request
                              </th>
                              <th></th>
                            </tr>
                          </thead>

                          <tbody>

                            {p.variants.map(
                              (v) => (
                                <tr
                                  key={
                                    v.variant_id
                                  }
                                >

                                  <td>
                                    {v.color}
                                  </td>

                                  <td>
                                    {v.size}
                                  </td>

                                  <td>
                                    {v.quantity}
                                  </td>

                                  <td>
                                    <input
                                      className="form-input"
                                      type="number"
                                      min="1"
                                      max={
                                        v.quantity
                                      }
                                      placeholder="0"
                                      value={
                                        requestQty[
                                          v.variant_id
                                        ] || ''
                                      }
                                      onChange={(
                                        e
                                      ) =>
                                        setRequestQty(
                                          (
                                            prev
                                          ) => ({
                                            ...prev,
                                            [v.variant_id]:
                                              e.target
                                                .value,
                                          })
                                        )
                                      }
                                      disabled={
                                        v.quantity ===
                                        0
                                      }
                                      style={{
                                        width: 90,
                                      }}
                                    />
                                  </td>

                                  <td>
                                    <button
                                      className="btn btn-sm btn-primary"
                                      onClick={() =>
                                        handleSubmitRequest(
                                          v.variant_id
                                        )
                                      }
                                      disabled={
                                        v.quantity ===
                                        0
                                      }
                                    >
                                      Request
                                    </button>
                                  </td>

                                </tr>
                              )
                            )}

                          </tbody>

                        </table>

                      </td>

                    </tr>
                  )}

                </Fragment>
              ))}

            </tbody>

          </table>
        </div>
      )}

      {/* ============================================
          PAST REQUESTS
      ============================================ */}

      <h3>Past Requests + Status</h3>

      {requestsByDate.length === 0 ? (
        <div className="empty-state">

          <span className="empty-state-icon">
            📋
          </span>

          No requests yet.

        </div>
      ) : (
        <div className="table-wrap">

          <table className="data-table">

            <thead>
              <tr>
                <th>Date</th>
                <th>Requests</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>

              {requestsByDate.map(
                ([dateLabel, dayRequests]) => (
                  <Fragment key={dateLabel}>

                    {/* DATE ROW */}
                    <tr key={dateLabel}>

                      <td>
                        {dateLabel}
                      </td>

                      <td>
                        {dayRequests.length}{' '}
                        request
                        {dayRequests.length !==
                        1
                          ? 's'
                          : ''}
                      </td>

                      <td>

                        <button
                          className="btn btn-sm"
                          onClick={() =>
                            setExpandedDate(
                              expandedDate ===
                                dateLabel
                                ? null
                                : dateLabel
                            )
                          }
                        >
                          {expandedDate ===
                          dateLabel
                            ? 'Hide'
                            : 'View Requests'}
                        </button>

                      </td>

                    </tr>

                    {/* REQUEST DETAILS */}
                    {expandedDate ===
                      dateLabel && (
                      <tr>

                        <td
                          colSpan={3}
                          style={{
                            background:
                              'var(--color-bg)',
                            padding: 16,
                          }}
                        >

                          <table className="data-table">

                            <thead>
                              <tr>
                                <th>ID</th>
                                <th>
                                  Product
                                </th>
                                <th>
                                  Colour
                                </th>
                                <th>
                                  Size
                                </th>
                                <th>
                                  Quantity
                                </th>
                                <th>
                                  Time
                                </th>
                                <th>
                                  Status
                                </th>
                                <th>
                                  Action
                                </th>
                              </tr>
                            </thead>

                            <tbody>

                              {dayRequests.map(
                                (r) => (
                                  <tr
                                    key={
                                      r.request_id
                                    }
                                  >

                                    <td>
                                      {
                                        r.request_id
                                      }
                                    </td>

                                    <td>
                                      {
                                        r
                                          .ProductVariant
                                          ?.Product
                                          ?.product_name
                                      }
                                    </td>

                                    <td>
                                      {
                                        r
                                          .ProductVariant
                                          ?.color
                                      }
                                    </td>

                                    <td>
                                      {
                                        r
                                          .ProductVariant
                                          ?.size
                                      }
                                    </td>

                                    <td>
                                      {
                                        r.quantity
                                      }
                                    </td>

                                    <td>
                                      {new Date(
                                        r.request_date
                                      ).toLocaleTimeString()}
                                    </td>

                                    <td>
                                      <span
                                        className={`badge badge-${r.status}`}
                                      >
                                        {r.status}
                                      </span>
                                    </td>

                                    <td>

                                      {/* PENDING */}
                                      {r.status ===
                                        'pending' && (
                                        <button
                                          className="btn btn-sm btn-danger"
                                          onClick={() =>
                                            handleCancelRequest(
                                              r.request_id
                                            )
                                          }
                                        >
                                          Cancel Request
                                        </button>
                                      )}

                                      {/* APPROVED */}
                                      {r.status ===
                                        'approved' && (
                                        <button
                                          className="btn btn-sm btn-success"
                                          onClick={() =>
                                            handleConfirmReceipt(
                                              r.request_id
                                            )
                                          }
                                        >
                                          Confirm Receipt
                                        </button>
                                      )}

                                      {/* CANCELLED */}
                                      {r.status ===
                                        'cancelled' && (
                                        <span
                                          style={{
                                            color:
                                              'var(--color-text-muted)',
                                            fontSize: 13,
                                          }}
                                        >
                                          Cancelled
                                        </span>
                                      )}

                                    </td>

                                  </tr>
                                )
                              )}

                            </tbody>

                          </table>

                        </td>

                      </tr>
                    )}

                  </Fragment>
                )
              )}

            </tbody>

          </table>

        </div>
      )}

    </Layout>
  );
}
