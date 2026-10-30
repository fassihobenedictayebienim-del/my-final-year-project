import { useEffect, useState } from "react";
import CollapsibleSection from "../components/CollapsibleSection";
import Layout from "../components/Layout";
import { useToast } from "../context/ToastContext";
import api from "../services/api";

const today = () => new Date().toISOString().slice(0, 10);
const emptyLine = (type = "existing") => ({
  type,
  product_id: "",
  product_name: "",
  unit_price: "",
  reorder_level: "",
  quantity: "",
});

export default function ShipmentPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [lines, setLines] = useState([emptyLine()]);
  const [dateReceived, setDateReceived] = useState(today());
  const [historyStart, setHistoryStart] = useState("");
  const [historyEnd, setHistoryEnd] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  async function load() {
    try {
      const [productResponse, shipmentResponse] = await Promise.all([
        api.get("/products"),
        api.get("/shipments", { params: { start_date: historyStart, end_date: historyEnd } }),
      ]);
      setProducts(productResponse.data.products || []);
      setShipments(shipmentResponse.data.shipments || []);
    } catch {
      showToast("Failed to load shipment data.", "error");
    }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => { load(); }, [historyStart, historyEnd]);

  function updateLine(index, values) {
    setLines((current) => current.map((line, i) => i === index ? { ...line, ...values } : line));
  }
  function changeType(index, type) {
    setLines((current) => current.map((line, i) => i === index ? emptyLine(type) : line));
  }
  function removeLine(index) {
    setLines((current) => current.length === 1 ? current : current.filter((_, i) => i !== index));
  }
  function validateLine(line, index) {
    if (!line.product_id.trim()) return `Line ${index + 1}: choose or enter a product ID.`;
    if (!Number.isInteger(Number(line.quantity)) || Number(line.quantity) <= 0)
      return `Line ${index + 1}: quantity must be a positive whole number.`;
    if (line.type === "new") {
      if (!line.product_name.trim()) return `Line ${index + 1}: enter the new product name.`;
      if (!Number.isFinite(Number(line.unit_price)) || Number(line.unit_price) < 0)
        return `Line ${index + 1}: price must be zero or more.`;
      if (!Number.isInteger(Number(line.reorder_level)) || Number(line.reorder_level) < 0)
        return `Line ${index + 1}: reorder level must be a whole number of zero or more.`;
      if (products.some((product) => product.product_id === line.product_id.trim()))
        return `Line ${index + 1}: that product ID already exists; use Existing product.`;
    }
    return null;
  }
  async function submit(event) {
    event.preventDefault();
    const error = lines.map(validateLine).find(Boolean);
    if (error) return showToast(error, "error");
    const ids = lines.map((line) => line.product_id.trim());
    if (new Set(ids).size !== ids.length)
      return showToast("A product can only appear once in a shipment.", "error");
    try {
      await api.post("/shipments/batch", {
        date_received: dateReceived,
        items: lines.map((line) => ({ ...line, product_id: line.product_id.trim() })),
      });
      showToast("Shipment received and inventory updated.");
      setLines([emptyLine()]);
      load();
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to receive shipment.", "error");
    }
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Receive Shipment</h1>
          <p>Receive existing stock or introduce new products in one delivery.</p>
        </div>
      </div>
      <form onSubmit={submit} className="form-card">
        <div>
          <label className="form-label" htmlFor="shipment-date">Delivery date</label>
          <input id="shipment-date" className="form-input" type="date" value={dateReceived} onChange={(e) => setDateReceived(e.target.value)} required />
        </div>
        <h3>Product lines</h3>
        {lines.map((line, index) => (
          <section className="shipment-line" key={index}>
            <div className="shipment-line-heading">
              <strong>Line {index + 1}</strong>
              <div className="action-buttons">
                <button type="button" className={`btn btn-sm ${line.type === "existing" ? "btn-primary" : ""}`} onClick={() => changeType(index, "existing")}>Existing product</button>
                <button type="button" className={`btn btn-sm ${line.type === "new" ? "btn-primary" : ""}`} onClick={() => changeType(index, "new")}>New product</button>
                {lines.length > 1 && <button type="button" className="btn btn-sm btn-danger" onClick={() => removeLine(index)}>Remove</button>}
              </div>
            </div>
            {line.type === "existing" ? (
              <div className="form-row">
                <div>
                  <label className="form-label">Product</label>
                  <input className="form-input" list={`products-${index}`} placeholder="Search by ID or name" value={line.product_id} onChange={(e) => updateLine(index, { product_id: e.target.value })} required />
                  <datalist id={`products-${index}`}>
                    {products.map((product) => <option key={product.product_id} value={product.product_id} label={`${product.product_id} — ${product.product_name}`} />)}
                  </datalist>
                </div>
                <div>
                  <label className="form-label">Quantity</label>
                  <input className="form-input" type="number" min="1" step="1" value={line.quantity} onChange={(e) => updateLine(index, { quantity: e.target.value })} required />
                </div>
              </div>
            ) : (
              <div className="form-row">
                <div><label className="form-label">Product ID</label><input className="form-input" value={line.product_id} onChange={(e) => updateLine(index, { product_id: e.target.value })} required /></div>
                <div><label className="form-label">Name</label><input className="form-input" value={line.product_name} onChange={(e) => updateLine(index, { product_name: e.target.value })} required /></div>
                <div><label className="form-label">Price (GH₵)</label><input className="form-input" type="number" min="0" step="0.01" value={line.unit_price} onChange={(e) => updateLine(index, { unit_price: e.target.value })} required /></div>
                <div><label className="form-label">Reorder level</label><input className="form-input" type="number" min="0" step="1" value={line.reorder_level} onChange={(e) => updateLine(index, { reorder_level: e.target.value })} required /></div>
                <div><label className="form-label">Quantity</label><input className="form-input" type="number" min="1" step="1" value={line.quantity} onChange={(e) => updateLine(index, { quantity: e.target.value })} required /></div>
              </div>
            )}
          </section>
        ))}
        <button type="button" className="btn btn-secondary" onClick={() => setLines((current) => [...current, emptyLine()])}>Add product line</button>
        <button className="btn btn-primary" style={{ marginLeft: 8 }}>Receive shipment</button>
      </form>
      <CollapsibleSection title={`Shipment History (${shipments.length})`} open={showHistory} onToggle={() => setShowHistory(!showHistory)}>
        <div className="form-row" style={{ marginBottom: 16 }}>
          <div><label className="form-label">From</label><input className="form-input" type="date" value={historyStart} onChange={(e) => setHistoryStart(e.target.value)} /></div>
          <div><label className="form-label">To</label><input className="form-input" type="date" value={historyEnd} onChange={(e) => setHistoryEnd(e.target.value)} /></div>
        </div>
        <div className="table-wrap"><table className="data-table"><thead><tr><th className="col-text">Date</th><th className="col-text">Product</th><th className="col-num">Quantity</th></tr></thead><tbody>
          {shipments.map((row) => <tr key={row.shipment_id}><td className="col-text">{new Date(row.date_received).toLocaleDateString()}</td><td className="col-text"><span className="mono">{row.product_id}</span> — {row.product_name} {row.is_new_product && <span className="badge badge-approved">New</span>}</td><td className="col-num">{row.quantity}</td></tr>)}
          {!shipments.length && <tr><td colSpan="3">No shipment lines match this date range.</td></tr>}
        </tbody></table></div>
      </CollapsibleSection>
    </Layout>
  );
}
