import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import api from '../services/api';
import { formatCurrency } from '../utils/currency';

export default function ReportsPage() {
  const { user } = useAuth();
  if (user.role === 'store_manager') return <StoreSalesReport />;
  if (user.role === 'administrator') return <AdminReport />;
  return <WarehouseReport />;
}

// ============================================================
// STORE MANAGER — sales-focused, product-grouped, no inventory
// duplication (that lives on My Inventory now).
// ============================================================
function StoreSalesReport() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [salesData, setSalesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  useEffect(() => {
    fetchSalesReport();
  }, []);

  async function fetchSalesReport(customStart, customEnd) {
    setLoading(true);
    try {
      const params = {};
      if (customStart) params.start_date = customStart;
      if (customEnd) params.end_date = customEnd;

      const response = await api.get('/reports/sales', { params });
      setSalesData(response.data);
    } catch (_err) {
      setError('Failed to load sales report.');
    } finally {
      setLoading(false);
    }
  }

  function handleFilter(e) {
    e.preventDefault();
    fetchSalesReport(startDate, endDate);
  }

  function clearFilter() {
    setStartDate('');
    setEndDate('');
    fetchSalesReport();
  }

  function groupByProduct(sales) {
    const byProduct = {};

    for (const s of sales) {
      const pid = s.ProductVariant.product_id;

      if (!byProduct[pid]) {
        byProduct[pid] = {
          product_id: pid,
          product_name: s.ProductVariant.Product.product_name,
          total_qty: 0,
          total_revenue: 0,
          variants: {}
        };
      }

      byProduct[pid].total_qty += s.quantity;
      byProduct[pid].total_revenue += Number(s.total_price);

      const vKey = `${s.ProductVariant.color}__${s.ProductVariant.size}`;

      if (!byProduct[pid].variants[vKey]) {
        byProduct[pid].variants[vKey] = {
          color: s.ProductVariant.color,
          size: s.ProductVariant.size,
          quantity: 0,
          revenue: 0
        };
      }

      byProduct[pid].variants[vKey].quantity += s.quantity;
      byProduct[pid].variants[vKey].revenue += Number(s.total_price);
    }

    return Object.values(byProduct)
      .map((p) => ({
        ...p,
        variants: Object.values(p.variants)
      }))
      .sort((a, b) => b.total_revenue - a.total_revenue);
  }

  const productSummary = salesData
    ? groupByProduct(salesData.sales)
    : [];

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Sales Report</h1>
          <p>Your store's sales performance by product.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form
        onSubmit={handleFilter}
        className="form-row"
        style={{ alignItems: 'flex-end', marginBottom: 16 }}
      >
        <div>
          <label className="form-label">From</label>
          <input
            type="date"
            className="form-input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <label className="form-label">To</label>
          <input
            type="date"
            className="form-input"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <button type="submit" className="btn btn-primary btn-sm">
          Filter
        </button>

        <button
          type="button"
          className="btn btn-sm btn-secondary"
          onClick={clearFilter}
        >
          Clear
        </button>
      </form>

      {loading ? (
        <div className="loading-row">
          <span
            className="spinner"
            style={{
              borderTopColor: 'var(--color-primary)',
              borderColor: 'var(--color-border)'
            }}
          />
          Loading report...
        </div>
      ) : (
        salesData && (
          <>
            <div className="stat-grid cols-3">
              <div className="card">
                <p className="stat-label">🧾 Total Transactions</p>
                <p className="stat-value" style={{ fontSize: 20 }}>
                  {salesData.summary.count}
                </p>
              </div>

              <div className="card">
                <p className="stat-label">📦 Total Quantity Sold</p>
                <p className="stat-value" style={{ fontSize: 20 }}>
                  {salesData.summary.total_quantity}
                </p>
              </div>

              <div className="card">
                <p className="stat-label">💰 Total Revenue</p>
                <p className="stat-value" style={{ fontSize: 20 }}>
                  {formatCurrency(salesData.summary.total_revenue)}
                </p>
              </div>
            </div>

            <h3>Sales by Product</h3>

            {productSummary.length === 0 ? (
              <div
                className="empty-state"
                style={{ marginBottom: 24 }}
              >
                <span className="empty-state-icon">🧾</span>
                No sales found for this period.
              </div>
            ) : (
              <div
                className="table-wrap"
                style={{ marginBottom: 24 }}
              >
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Total Sold</th>
                      <th>Revenue</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {productSummary.map((p) => (
                      <>
                        <tr key={p.product_id}>
                          <td>{p.product_name}</td>
                          <td>{p.total_qty}</td>
                          <td>
                            {formatCurrency(p.total_revenue)}
                          </td>
                          <td>
                            <button
                              className="btn btn-sm"
                              onClick={() =>
                                setExpandedProduct(
                                  expandedProduct === p.product_id
                                    ? null
                                    : p.product_id
                                )
                              }
                            >
                              {expandedProduct === p.product_id
                                ? 'Hide Variants'
                                : 'View Variants'}
                            </button>
                          </td>
                        </tr>

                        {expandedProduct === p.product_id && (
                          <tr>
                            <td
                              colSpan={4}
                              style={{
                                background: 'var(--color-bg)',
                                padding: 16
                              }}
                            >
                              <table className="data-table">
                                <thead>
                                  <tr>
                                    <th>Colour</th>
                                    <th>Size</th>
                                    <th>Quantity Sold</th>
                                    <th>Revenue</th>
                                  </tr>
                                </thead>

                                <tbody>
                                  {p.variants.map((v, i) => (
                                    <tr key={i}>
                                      <td>{v.color}</td>
                                      <td>{v.size}</td>
                                      <td>{v.quantity}</td>
                                      <td>
                                        {formatCurrency(v.revenue)}
                                      </td>
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

            <button
              className="btn btn-sm btn-secondary"
              onClick={() =>
                setShowAllTransactions((s) => !s)
              }
              style={{ marginBottom: 12 }}
            >
              {showAllTransactions
                ? 'Hide All Transactions'
                : `View All Transactions (${salesData.sales.length})`}
            </button>

            {showAllTransactions &&
              (salesData.sales.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-state-icon">🧾</span>
                  No transactions in this period.
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Colour</th>
                        <th>Size</th>
                        <th>Qty</th>
                        <th>Total</th>
                        <th>Date</th>
                      </tr>
                    </thead>

                    <tbody>
                      {salesData.sales.map((s) => (
                        <tr key={s.sale_id}>
                          <td>
                            {s.ProductVariant?.Product?.product_name}
                          </td>
                          <td>{s.ProductVariant?.color}</td>
                          <td>{s.ProductVariant?.size}</td>
                          <td>{s.quantity}</td>
                          <td>
                            {formatCurrency(s.total_price)}
                          </td>
                          <td>
                            {new Date(
                              s.sale_date
                            ).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
          </>
        )
      )}
    </Layout>
  );
}

// ============================================================
// ADMINISTRATOR — system-wide reports
// Inventory hierarchy:
// LOCATION → PRODUCT → VARIANT
// ============================================================
function AdminReport() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [salesData, setSalesData] = useState(null);
  const [inventoryData, setInventoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [expandedProduct, setExpandedProduct] = useState(null);
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  // Inventory expansion states
  const [expandedLocations, setExpandedLocations] = useState({});
  const [expandedInventoryProducts, setExpandedInventoryProducts] =
    useState({});

  useEffect(() => {
    fetchInventoryValue();
    fetchSalesReport();
  }, []);

  async function fetchInventoryValue() {
    try {
      const response = await api.get('/reports/inventory-value');
      setInventoryData(response.data);
    } catch (_err) {
      setError('Failed to load inventory value.');
    }
  }

  async function fetchSalesReport(customStart, customEnd) {
    setLoading(true);

    try {
      const params = {};

      if (customStart) params.start_date = customStart;
      if (customEnd) params.end_date = customEnd;

      const response = await api.get('/reports/sales', { params });
      setSalesData(response.data);
    } catch (_err) {
      setError('Failed to load sales report.');
    } finally {
      setLoading(false);
    }
  }

  function handleFilter(e) {
    e.preventDefault();
    fetchSalesReport(startDate, endDate);
  }

  function clearFilter() {
    setStartDate('');
    setEndDate('');
    fetchSalesReport();
  }

  // ============================================================
  // INVENTORY GROUPING
  // LOCATION → PRODUCT → VARIANT
  // ============================================================
  function groupInventoryByLocation(breakdown) {
    const locations = {};

    for (const row of breakdown) {
      const locationKey = row.warehouse_id
        ? `warehouse-${row.warehouse_id}`
        : `store-${row.store_id}`;

      const locationName = row.warehouse_id
        ? `Warehouse ${row.warehouse_id}`
        : `Store ${row.store_id}`;

      if (!locations[locationKey]) {
        locations[locationKey] = {
          key: locationKey,
          name: locationName,
          products: {}
        };
      }

      const productId = row.product_id;

      if (!locations[locationKey].products[productId]) {
        locations[locationKey].products[productId] = {
          product_id: productId,
          product_name: row.product_name,
          unit_price: Number(row.unit_price),
          total_quantity: 0,
          total_value: 0,
          variants: {}
        };
      }

      const product =
        locations[locationKey].products[productId];

      const quantity = Number(row.quantity);
      const value = Number(row.value);

      product.total_quantity += quantity;
      product.total_value += value;

      // Group by colour + size
      const variantKey = `${row.color}__${row.size}`;

      if (!product.variants[variantKey]) {
        product.variants[variantKey] = {
          color: row.color,
          size: row.size,
          quantity: 0,
          unit_price: Number(row.unit_price),
          value: 0
        };
      }

      product.variants[variantKey].quantity += quantity;
      product.variants[variantKey].value += value;
    }

    return Object.values(locations)
      .map((location) => {
        const products = Object.values(location.products);

        const totalValue = products.reduce(
          (sum, product) => sum + product.total_value,
          0
        );

        return {
          ...location,
          products,
          total_value: totalValue
        };
      })
      .sort((a, b) => {
        if (a.name.startsWith('Warehouse')) return -1;
        if (b.name.startsWith('Warehouse')) return 1;

        return a.name.localeCompare(b.name);
      });
  }

  const groupedInventory = inventoryData
    ? groupInventoryByLocation(inventoryData.breakdown)
    : [];

  function toggleLocation(locationKey) {
    setExpandedLocations((prev) => ({
      ...prev,
      [locationKey]: !prev[locationKey]
    }));
  }

  function toggleInventoryProduct(productKey) {
    setExpandedInventoryProducts((prev) => ({
      ...prev,
      [productKey]: !prev[productKey]
    }));
  }

  // ============================================================
  // SALES GROUPING
  // ============================================================
  function groupByProduct(sales) {
    const byProduct = {};

    for (const s of sales) {
      const pid = s.ProductVariant.product_id;

      if (!byProduct[pid]) {
        byProduct[pid] = {
          product_id: pid,
          product_name:
            s.ProductVariant.Product.product_name,
          total_qty: 0,
          total_revenue: 0,
          variants: {}
        };
      }

      byProduct[pid].total_qty += s.quantity;
      byProduct[pid].total_revenue += Number(
        s.total_price
      );

      const vKey = `${s.ProductVariant.color}__${s.ProductVariant.size}__${s.store_id}`;

      if (!byProduct[pid].variants[vKey]) {
        byProduct[pid].variants[vKey] = {
          color: s.ProductVariant.color,
          size: s.ProductVariant.size,
          store_id: s.store_id,
          quantity: 0,
          revenue: 0
        };
      }

      byProduct[pid].variants[vKey].quantity += s.quantity;
      byProduct[pid].variants[vKey].revenue += Number(
        s.total_price
      );
    }

    return Object.values(byProduct)
      .map((p) => ({
        ...p,
        variants: Object.values(p.variants)
      }))
      .sort(
        (a, b) => b.total_revenue - a.total_revenue
      );
  }

  const productSummary = salesData
    ? groupByProduct(salesData.sales)
    : [];

  function groupByStore(sales) {
    const byStore = {};

    for (const s of sales) {
      if (!byStore[s.store_id]) {
        byStore[s.store_id] = {
          store_id: s.store_id,
          quantity: 0,
          revenue: 0
        };
      }

      byStore[s.store_id].quantity += s.quantity;
      byStore[s.store_id].revenue += Number(
        s.total_price
      );
    }

    return Object.values(byStore).sort(
      (a, b) => a.store_id - b.store_id
    );
  }

  const storeSummary = salesData
    ? groupByStore(salesData.sales)
    : [];

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p>System-wide sales and inventory value.</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">{error}</div>
      )}

      {/* ======================================================
          ADMIN INVENTORY VALUE
          LOCATION → PRODUCT → VARIANT
         ====================================================== */}
      {inventoryData && (
        <div style={{ marginBottom: 28 }}>
          <h3>Inventory Value (All Locations)</h3>

          <div
            className="card"
            style={{
              marginBottom: 16,
              display: 'inline-block'
            }}
          >
            <p className="stat-label">Grand Total</p>

            <p
              className="stat-value"
              style={{ margin: '4px 0 0' }}
            >
              {formatCurrency(inventoryData.total_value)}
            </p>
          </div>

          {/* LOCATION LEVEL */}
          {groupedInventory.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">📦</span>
              No inventory found.
            </div>
          ) : (
            <div>
              {groupedInventory.map((location) => {
                const isLocationExpanded =
                  !!expandedLocations[location.key];

                return (
                  <div
                    key={location.key}
                    className="card"
                    style={{
                      marginBottom: 12,
                      padding: 0,
                      overflow: 'hidden'
                    }}
                  >
                    {/* LOCATION HEADER */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 16,
                        padding: '14px 16px'
                      }}
                    >
                      <div>
                        <h4
                          style={{
                            margin: 0,
                            fontSize: 15,
                            fontWeight: 700
                          }}
                        >
                          {location.name}
                        </h4>

                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 12,
                            color:
                              'var(--color-text-muted)'
                          }}
                        >
                          {location.products.length}{' '}
                          {location.products.length === 1
                            ? 'Product'
                            : 'Products'}
                          {' • '}
                          Inventory Value: {formatCurrency(location.total_value)}
                        </div>
                      </div>

                      <button
                        className="btn btn-sm"
                        onClick={() =>
                          toggleLocation(location.key)
                        }
                      >
                        {isLocationExpanded
                          ? 'Hide Products'
                          : 'View Products'}
                      </button>
                    </div>

                    {/* PRODUCT LEVEL */}
                    {isLocationExpanded && (
                      <div
                        style={{
                          borderTop:
                            '1px solid var(--color-border)',
                          padding: 16
                        }}
                      >
                        <div className="table-wrap">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Product ID</th>
                                <th>Product</th>
                                <th>Total Qty</th>
                                <th>Unit Price</th>
                                <th>Inventory Value</th>
                                <th>Action</th>
                              </tr>
                            </thead>

                            <tbody>
                              {location.products.map(
                                (product) => {
                                  const productKey = `${location.key}__${product.product_id}`;

                                  const isProductExpanded =
                                    !!expandedInventoryProducts[
                                      productKey
                                    ];

                                  return (
                                    <>
                                      <tr
                                        key={productKey}
                                      >
                                        <td>
                                          {
                                            product.product_id
                                          }
                                        </td>

                                        <td>
                                          {
                                            product.product_name
                                          }
                                        </td>

                                        <td>
                                          {
                                            product.total_quantity
                                          }
                                        </td>

                                        <td>
                                          {formatCurrency(product.unit_price)}
                                        </td>

                                        <td>
                                          {formatCurrency(product.total_value)}
                                        </td>

                                        <td>
                                          <button
                                            className="btn btn-sm"
                                            onClick={() =>
                                              toggleInventoryProduct(
                                                productKey
                                              )
                                            }
                                          >
                                            {isProductExpanded
                                              ? 'Hide Variants'
                                              : 'View Variants'}
                                          </button>
                                        </td>
                                      </tr>

                                      {/* VARIANT LEVEL */}
                                      {isProductExpanded && (
                                        <tr>
                                          <td
                                            colSpan={6}
                                            style={{
                                              background:
                                                'var(--color-bg)',
                                              padding: 16
                                            }}
                                          >
                                            <div
                                              style={{
                                                fontSize: 13,
                                                fontWeight: 700,
                                                marginBottom: 10
                                              }}
                                            >
                                              {
                                                product.product_name
                                              }{' '}
                                              Variants
                                            </div>

                                            <table className="data-table">
                                              <thead>
                                                <tr>
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
                                                    Unit Price
                                                  </th>
                                                  <th>
                                                    Value
                                                  </th>
                                                </tr>
                                              </thead>

                                              <tbody>
                                                {Object.values(
                                                  product.variants
                                                ).map(
                                                  (
                                                    variant,
                                                    index
                                                  ) => (
                                                    <tr
                                                      key={`${productKey}__variant__${index}`}
                                                    >
                                                      <td>
                                                        {
                                                          variant.color
                                                        }
                                                      </td>

                                                      <td>
                                                        {
                                                          variant.size
                                                        }
                                                      </td>

                                                      <td>
                                                        {
                                                          variant.quantity
                                                        }
                                                      </td>

                                                      <td>
                                                        {formatCurrency(variant.unit_price)}
                                                      </td>

                                                      <td>
                                                        {formatCurrency(variant.value)}
                                                      </td>
                                                    </tr>
                                                  )
                                                )}
                                              </tbody>
                                            </table>
                                          </td>
                                        </tr>
                                      )}
                                    </>
                                  );
                                }
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================
          SALES REPORT
         ====================================================== */}
      <h3>Sales Report</h3>

      <form
        onSubmit={handleFilter}
        className="form-row"
        style={{
          alignItems: 'flex-end',
          marginBottom: 16
        }}
      >
        <div>
          <label className="form-label">From</label>
          <input
            type="date"
            className="form-input"
            value={startDate}
            onChange={(e) =>
              setStartDate(e.target.value)
            }
          />
        </div>

        <div>
          <label className="form-label">To</label>
          <input
            type="date"
            className="form-input"
            value={endDate}
            onChange={(e) =>
              setEndDate(e.target.value)
            }
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-sm"
        >
          Filter
        </button>

        <button
          type="button"
          className="btn btn-sm btn-secondary"
          onClick={clearFilter}
        >
          Clear
        </button>
      </form>

      {loading ? (
        <div className="loading-row">
          <span
            className="spinner"
            style={{
              borderTopColor: 'var(--color-primary)',
              borderColor: 'var(--color-border)'
            }}
          />
          Loading report...
        </div>
      ) : (
        salesData && (
          <>
            <div className="stat-grid cols-3">
              <div className="card">
                <p className="stat-label">
                  Total Transactions
                </p>

                <p
                  className="stat-value"
                  style={{ fontSize: 20 }}
                >
                  {salesData.summary.count}
                </p>
              </div>

              <div className="card">
                <p className="stat-label">
                  Total Quantity Sold
                </p>

                <p
                  className="stat-value"
                  style={{ fontSize: 20 }}
                >
                  {salesData.summary.total_quantity}
                </p>
              </div>

              <div className="card">
                <p className="stat-label">
                  Total Revenue
                </p>

                <p
                  className="stat-value"
                  style={{ fontSize: 20 }}
                >
                  {formatCurrency(salesData.summary.total_revenue)}
                </p>
              </div>
            </div>

            {/* SALES BY STORE */}
            <h3>Sales by Store</h3>

            {storeSummary.length === 0 ? (
              <div
                className="empty-state"
                style={{ marginBottom: 24 }}
              >
                <span className="empty-state-icon">
                  🏬
                </span>
                No sales found for this period.
              </div>
            ) : (
              <div
                className="table-wrap"
                style={{ marginBottom: 24 }}
              >
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Store</th>
                      <th>Quantity Sold</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>

                  <tbody>
                    {storeSummary.map((s) => (
                      <tr key={s.store_id}>
                        <td>Store {s.store_id}</td>
                        <td>{s.quantity}</td>
                        <td>
                          {formatCurrency(s.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* SALES BY PRODUCT */}
            <h3>Sales by Product</h3>

            {productSummary.length === 0 ? (
              <div
                className="empty-state"
                style={{ marginBottom: 24 }}
              >
                <span className="empty-state-icon">
                  🧾
                </span>
                No sales found for this period.
              </div>
            ) : (
              <div
                className="table-wrap"
                style={{ marginBottom: 24 }}
              >
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Total Sold</th>
                      <th>Revenue</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {productSummary.map((p) => (
                      <>
                        <tr key={p.product_id}>
                          <td>{p.product_name}</td>
                          <td>{p.total_qty}</td>
                          <td>
                            {formatCurrency(p.total_revenue)}
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

                        {expandedProduct ===
                          p.product_id && (
                          <tr>
                            <td
                              colSpan={4}
                              style={{
                                background:
                                  'var(--color-bg)',
                                padding: 16
                              }}
                            >
                              <table className="data-table">
                                <thead>
                                  <tr>
                                    <th>Colour</th>
                                    <th>Size</th>
                                    <th>Store</th>
                                    <th>
                                      Quantity Sold
                                    </th>
                                    <th>Revenue</th>
                                  </tr>
                                </thead>

                                <tbody>
                                  {p.variants.map(
                                    (v, i) => (
                                      <tr key={i}>
                                        <td>
                                          {v.color}
                                        </td>
                                        <td>
                                          {v.size}
                                        </td>
                                        <td>
                                          Store{' '}
                                          {v.store_id}
                                        </td>
                                        <td>
                                          {v.quantity}
                                        </td>
                                        <td>
                                          {formatCurrency(v.revenue)}
                                        </td>
                                      </tr>
                                    )
                                  )}
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

            {/* ALL TRANSACTIONS */}
            <button
              className="btn btn-sm btn-secondary"
              onClick={() =>
                setShowAllTransactions((s) => !s)
              }
              style={{ marginBottom: 12 }}
            >
              {showAllTransactions
                ? 'Hide All Transactions'
                : `View All Transactions (${salesData.sales.length})`}
            </button>

            {showAllTransactions &&
              (salesData.sales.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-state-icon">
                    🧾
                  </span>
                  No transactions in this period.
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Colour</th>
                        <th>Size</th>
                        <th>Store</th>
                        <th>Qty</th>
                        <th>Total</th>
                        <th>Date</th>
                      </tr>
                    </thead>

                    <tbody>
                      {salesData.sales.map((s) => (
                        <tr key={s.sale_id}>
                          <td>
                            {
                              s.ProductVariant?.Product
                                ?.product_name
                            }
                          </td>

                          <td>
                            {s.ProductVariant?.color}
                          </td>

                          <td>
                            {s.ProductVariant?.size}
                          </td>

                          <td>
                            Store {s.store_id}
                          </td>

                          <td>{s.quantity}</td>

                          <td>
                            {formatCurrency(s.total_price)}
                          </td>

                          <td>
                            {new Date(
                              s.sale_date
                            ).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
          </>
        )
      )}
    </Layout>
  );
}

// ============================================================
// WAREHOUSE MANAGER — collapsible locations + collapsed transactions
// ============================================================
function WarehouseReport() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [salesData, setSalesData] = useState(null);
  const [inventoryData, setInventoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [expandedLocations, setExpandedLocations] = useState({});
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  useEffect(() => {
    fetchInventoryValue();
    fetchSalesReport();
  }, []);

  async function fetchInventoryValue() {
    try {
      const response = await api.get('/reports/inventory-value');
      setInventoryData(response.data);
    } catch (_err) {
      setError('Failed to load inventory value.');
    }
  }

  async function fetchSalesReport(customStart, customEnd) {
    setLoading(true);
    try {
      const params = {};
      if (customStart) params.start_date = customStart;
      if (customEnd) params.end_date = customEnd;

      const response = await api.get('/reports/sales', { params });
      setSalesData(response.data);
    } catch (_err) {
      setError('Failed to load sales report.');
    } finally {
      setLoading(false);
    }
  }

  function handleFilter(e) {
    e.preventDefault();
    fetchSalesReport(startDate, endDate);
  }

  function clearFilter() {
    setStartDate('');
    setEndDate('');
    fetchSalesReport();
  }

  function groupByLocation(breakdown) {
    const groups = {};

    for (const row of breakdown) {
      const key = row.warehouse_id
        ? `Warehouse ${row.warehouse_id}`
        : `Store ${row.store_id}`;

      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    }

    return Object.entries(groups).sort(([a], [b]) => {
      if (a.startsWith('Warehouse')) return -1;
      if (b.startsWith('Warehouse')) return 1;
      return a.localeCompare(b);
    });
  }

  const groupedInventory = inventoryData
    ? groupByLocation(inventoryData.breakdown)
    : [];

  function toggleLocation(locationName) {
    setExpandedLocations((prev) => ({
      ...prev,
      [locationName]: !prev[locationName]
    }));
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p>Sales history and inventory value.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* ======================================================
          INVENTORY VALUE — collapsible per location
         ====================================================== */}
      {inventoryData && (
        <div style={{ marginBottom: 28 }}>
          <h3>Inventory Value (Warehouse)</h3>

          <div
            className="card"
            style={{ marginBottom: 16, display: 'inline-block' }}
          >
            <p className="stat-label">Grand Total</p>
            <p className="stat-value" style={{ margin: '4px 0 0' }}>
              {formatCurrency(inventoryData.total_value)}
            </p>
          </div>

          {groupedInventory.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">📦</span>
              No inventory found.
            </div>
          ) : (
            groupedInventory.map(([locationName, rows]) => {
              const subtotal = rows.reduce(
                (sum, r) => sum + Number(r.value),
                0
              );
              const isExpanded = !!expandedLocations[locationName];

              return (
                <div
                  key={locationName}
                  className="card"
                  style={{ marginBottom: 12, padding: 0, overflow: 'hidden' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 16,
                      padding: '14px 16px'
                    }}
                  >
                    <div>
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                        {locationName}
                      </h4>
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 12,
                          color: 'var(--color-text-muted)'
                        }}
                      >
                        {rows.length} {rows.length === 1 ? 'item' : 'items'}
                        {' • '}
                        Subtotal: {formatCurrency(subtotal)}
                      </div>
                    </div>

                    <button
                      className="btn btn-sm"
                      onClick={() => toggleLocation(locationName)}
                    >
                      {isExpanded ? 'Hide Items' : 'View Items'}
                    </button>
                  </div>

                  {isExpanded && (
                    <div
                      style={{
                        borderTop: '1px solid var(--color-border)',
                        padding: 16
                      }}
                    >
                      <div className="table-wrap">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Product</th>
                              <th>Colour</th>
                              <th>Size</th>
                              <th>Qty</th>
                              <th>Unit Price</th>
                              <th>Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row, i) => (
                              <tr key={i}>
                                <td>{row.product_name}</td>
                                <td>{row.color}</td>
                                <td>{row.size}</td>
                                <td>{row.quantity}</td>
                                <td>{formatCurrency(row.unit_price)}</td>
                                <td>{formatCurrency(row.value)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ======================================================
          SALES REPORT — summary always visible, table collapsed
         ====================================================== */}
      <h3>Sales Report</h3>

      <form
        onSubmit={handleFilter}
        className="form-row"
        style={{ alignItems: 'flex-end', marginBottom: 16 }}
      >
        <div>
          <label className="form-label">From</label>
          <input
            type="date"
            className="form-input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <label className="form-label">To</label>
          <input
            type="date"
            className="form-input"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <button type="submit" className="btn btn-primary btn-sm">
          Filter
        </button>

        <button
          type="button"
          className="btn btn-sm btn-secondary"
          onClick={clearFilter}
        >
          Clear
        </button>
      </form>

      {loading ? (
        <div className="loading-row">
          <span
            className="spinner"
            style={{
              borderTopColor: 'var(--color-primary)',
              borderColor: 'var(--color-border)'
            }}
          />
          Loading report...
        </div>
      ) : (
        salesData && (
          <>
            <div className="stat-grid cols-3">
              <div className="card">
                <p className="stat-label">Total Transactions</p>
                <p className="stat-value" style={{ fontSize: 20 }}>
                  {salesData.summary.count}
                </p>
              </div>

              <div className="card">
                <p className="stat-label">Total Quantity Sold</p>
                <p className="stat-value" style={{ fontSize: 20 }}>
                  {salesData.summary.total_quantity}
                </p>
              </div>

              <div className="card">
                <p className="stat-label">Total Revenue</p>
                <p className="stat-value" style={{ fontSize: 20 }}>
                  {formatCurrency(salesData.summary.total_revenue)}
                </p>
              </div>
            </div>

            <button
              className="btn btn-sm btn-secondary"
              onClick={() => setShowAllTransactions((s) => !s)}
              style={{ marginBottom: 12 }}
            >
              {showAllTransactions
                ? 'Hide All Transactions'
                : `View All Transactions (${salesData.sales.length})`}
            </button>

            {showAllTransactions &&
              (salesData.sales.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-state-icon">🧾</span>
                  No transactions in this period.
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Colour</th>
                        <th>Size</th>
                        <th>Store</th>
                        <th>Qty</th>
                        <th>Total</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesData.sales.map((s) => (
                        <tr key={s.sale_id}>
                          <td>{s.ProductVariant?.Product?.product_name}</td>
                          <td>{s.ProductVariant?.color}</td>
                          <td>{s.ProductVariant?.size}</td>
                          <td>Store {s.store_id}</td>
                          <td>{s.quantity}</td>
                          <td>{formatCurrency(s.total_price)}</td>
                          <td>{new Date(s.sale_date).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
          </>
        )
      )}
    </Layout>
  );
}
