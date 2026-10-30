import { useEffect, useRef, useState } from "react";
import { FileDown } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import regularFontUrl from "../assets/NotoSans-Regular.ttf?url";
import boldFontUrl from "../assets/NotoSans-Bold.ttf?url";
const iso = (date) => date.toISOString().slice(0, 10);
const today = iso(new Date());
function presetDates(preset) {
  const end = new Date();
  const start = new Date();
  if (preset === "today") return { start: today, end: today };
  if (preset === "7") start.setDate(end.getDate() - 6);
  if (preset === "30") start.setDate(end.getDate() - 29);
  if (preset === "month") start.setDate(1);
  if (preset === "last") {
    start.setMonth(start.getMonth() - 1, 1);
    end.setDate(0);
  }
  return preset === "all"
    ? { start: "", end: "" }
    : { start: iso(start), end: iso(end) };
}
async function b64(url) {
  const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
  let text = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(text);
}
async function savePdf(title, rangeLabel, sections, fileName) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const [regular, bold] = await Promise.all([
    b64(regularFontUrl),
    b64(boldFontUrl),
  ]);
  doc.addFileToVFS("NotoSans-Regular.ttf", regular);
  doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
  doc.addFileToVFS("NotoSans-Bold.ttf", bold);
  doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");
  let y = 18;
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 8, "F");
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(18);
  doc.text(title, 14, y);
  y += 8;
  doc.setFont("NotoSans", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 99, 112);
  doc.text(`Period: ${rangeLabel}`, 14, y);
  y += 5;
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, y);
  y += 8;
  const nonEmpty = sections.some((s) => s.body?.length);
  sections.forEach((s) => {
    if (!s.body?.length) return;
    autoTable(doc, {
      startY: y,
      head: [s.head],
      body: s.body,
      margin: { left: 14, right: 14 },
      styles: {
        font: "NotoSans",
        fontStyle: "normal",
        fontSize: 8.5,
        cellPadding: 2.5,
      },
      headStyles: {
        font: "NotoSans",
        fontStyle: "bold",
        fillColor: [37, 99, 235],
        textColor: 255,
      },
      didDrawPage: () => {
        doc.setFont("NotoSans", "normal");
        doc.setFontSize(8);
        doc.text("MOAE Inventory Management", 14, 290);
      },
    });
    y = doc.lastAutoTable.finalY + 10;
  });
  if (!nonEmpty) {
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(11);
    doc.text("No records for this period.", 14, y);
  }
  doc.save(`${fileName}.pdf`);
}
export default function PdfExportButton({
  title,
  fileName,
  getSections,
  defaultRange = "all",
}) {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState(defaultRange);
  const [dates, setDates] = useState(() => presetDates(defaultRange));
  const [error, setError] = useState("");
  const modal = useRef(null);
  useEffect(() => {
    if (!open) return;
    modal.current?.querySelector("button")?.focus();
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open]);
  function select(value) {
    setPreset(value);
    setDates(presetDates(value));
    setError("");
  }
  async function exportIt() {
    if (dates.start && dates.end && dates.start > dates.end)
      return setError("Start date must not be after end date.");
    if (dates.end && dates.end > today)
      return setError("End date cannot be in the future.");
    const label = dates.start
      ? `${new Date(`${dates.start}T00:00:00`).toLocaleDateString()} to ${new Date(`${dates.end || today}T00:00:00`).toLocaleDateString()}`
      : "All time";
    const sections = await getSections({
      start_date: dates.start,
      end_date: dates.end,
    });
    await savePdf(title, label, sections, fileName);
    setOpen(false);
  }
  return (
    <>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => setOpen(true)}
      >
        <FileDown size={16} /> Export as PDF
      </button>
      {open && (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal-box export-modal"
            ref={modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pdf-export-title"
          >
            <h2 id="pdf-export-title">Export PDF</h2>
            <p className="form-hint">
              Choose the period to include. The current page filters will not
              change.
            </p>
            <div className="preset-buttons">
              {[
                ["today", "Today"],
                ["7", "Last 7 days"],
                ["30", "Last 30 days"],
                ["month", "This month"],
                ["last", "Last month"],
                ["all", "All time"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`btn btn-sm ${preset === value ? "btn-primary" : ""}`}
                  onClick={() => select(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="form-row">
              <div>
                <label className="form-label" htmlFor="pdf-start">
                  Start date
                </label>
                <input
                  id="pdf-start"
                  className="form-input"
                  type="date"
                  value={dates.start}
                  onChange={(e) => {
                    setPreset("custom");
                    setDates({ ...dates, start: e.target.value });
                  }}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="pdf-end">
                  End date
                </label>
                <input
                  id="pdf-end"
                  className="form-input"
                  type="date"
                  max={today}
                  value={dates.end}
                  onChange={(e) => {
                    setPreset("custom");
                    setDates({ ...dates, end: e.target.value });
                  }}
                />
              </div>
            </div>
            {error && <p className="form-error">{error}</p>}
            <div className="action-buttons">
              <button className="btn btn-primary" onClick={exportIt}>
                Export PDF
              </button>
              <button className="btn" onClick={() => setOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
