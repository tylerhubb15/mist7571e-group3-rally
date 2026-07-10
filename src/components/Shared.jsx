import React from "react";
import { Sparkles, Loader2, AlertTriangle } from "lucide-react";

export const ScoreRing = ({ value, size = 58 }) => {
  const col = value >= 75 ? "var(--optic)" : value >= 50 ? "#e9d34a" : "var(--clay)";
  return (
    <div className="ring" style={{ width: size, height: size, flexShrink: 0,
      background: `conic-gradient(${col} ${value * 3.6}deg, var(--paper2) 0deg)` }}>
      <div className="ring" style={{ width: size - 10, height: size - 10, background: "#fff" }}>
        <span className="disp" style={{ fontSize: size * 0.29, fontWeight: 800 }}>{value}</span>
      </div>
    </div>
  );
};

export const Avatar = ({ name, size = 44, style: s = {} }) => (
  <div className="ring disp" style={{ width: size, height: size, background: "var(--ink)",
    color: "var(--optic)", fontWeight: 800, fontSize: size * 0.36, flexShrink: 0,
    border: "1.5px solid var(--ink)", ...s }}>
    {name === "You" ? "ME" : name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
  </div>
);

export const Header = ({ eyebrow, title, sub }) => (
  <div style={{ marginBottom: 20 }}>
    <div className="tag" style={{ background: "var(--optic)", marginBottom: 8 }}>
      <Sparkles size={12} />{eyebrow}
    </div>
    <h1 className="disp" style={{ fontSize: 30, fontWeight: 800, margin: "0 0 4px" }}>{title}</h1>
    {sub ? <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, fontWeight: 600 }}>{sub}</p> : null}
  </div>
);

export const Loading = ({ label = "Loading…" }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    padding: 28, color: "var(--muted)", fontWeight: 600, fontSize: 13 }}>
    <Loader2 size={16} className="spin" />
    {label}
  </div>
);

export const ErrorNote = ({ error, label }) => {
  if (!error) return null;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 7, padding: "10px 12px",
      borderRadius: 10, border: "1.5px solid var(--clay)", background: "rgba(196,90,60,.08)",
      color: "var(--clay)", fontWeight: 600, fontSize: 12.5, marginBottom: 12 }}>
      <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>{label || error.message || "Something went wrong."}</span>
    </div>
  );
};

export const Field = ({ label, children }) => (
  <div className="card" style={{ padding: 16, marginBottom: 14 }}>
    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".05em" }}>
      {label}
    </div>
    {children}
  </div>
);
