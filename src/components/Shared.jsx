import React from "react";
import { Sparkles, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

export const ScoreRing = ({ value, size = 58 }) => {
  const col = value >= 75 ? "var(--optic)" : value >= 50 ? "#e9d34a" : "var(--clay)";
  return (
    <div className="ring flex-shrink-0" style={{ width: size, height: size,
      background: `conic-gradient(${col} ${value * 3.6}deg, var(--paper2) 0deg)` }}>
      <div className="ring" style={{ width: size - 10, height: size - 10, background: "#fff" }}>
        <span className="disp" style={{ fontSize: size * 0.29, fontWeight: 800 }}>{value}</span>
      </div>
    </div>
  );
};

export const Avatar = ({ name, size = 44, style: s = {} }) => (
  <div className="ring disp avatar-me flex-shrink-0" style={{ width: size, height: size,
    fontSize: size * 0.36, ...s }}>
    {name === "You" ? "ME" : name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
  </div>
);

export const Header = ({ eyebrow, title, sub }) => (
  <div className="header-main">
    <div className="tag header-tag mb-8">
      <Sparkles size={12} />{eyebrow}
    </div>
    <h1 className="disp header-title" style={{ margin: "0 0 4px" }}>{title}</h1>
    {sub ? <p className="header-subtitle" style={{ margin: 0 }}>{sub}</p> : null}
  </div>
);

export const Loading = ({ label = "Loading…" }) => (
  <div className="note-loading">
    <Loader2 size={16} className="spin" />
    {label}
  </div>
);

export const ErrorNote = ({ error, label }) => {
  if (!error) return null;
  return (
    <div className="note-error">
      <AlertTriangle size={14} className="note-error-icon" />
      <span>{label || error.message || "Something went wrong."}</span>
    </div>
  );
};

export const SuccessNote = ({ show, label }) => {
  if (!show) return null;
  return (
    <div className="note-success">
      <CheckCircle2 size={14} className="flex-shrink-0" />
      <span>{label}</span>
    </div>
  );
};

export const CharWarning = ({ show, label = "Emojis and special characters aren't allowed." }) => {
  if (!show) return null;
  return (
    <div className="note-warning">
      {label}
    </div>
  );
};

export const Field = ({ label, children }) => (
  <div className="card card-field">
    <div className="text-label-mb">
      {label}
    </div>
    {children}
  </div>
);
