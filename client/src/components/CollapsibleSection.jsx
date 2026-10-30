import { ChevronDown, ChevronUp } from "lucide-react";

export default function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
  className = "",
}) {
  return (
    <section className={`collapsible-section ${className}`}>
      <button
        type="button"
        className="collapsible-section-toggle"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span>{title}</span>
        <span className="collapsible-section-action">
          {open ? "Hide" : "Show"}{" "}
          {open ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
        </span>
      </button>
      {open && <div className="collapsible-section-content">{children}</div>}
    </section>
  );
}
