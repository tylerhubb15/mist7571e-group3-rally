import React from "react";
import { Sparkles, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

export const ScoreRing = ({ value, size = 58 }) => {
  const col = value >= 75 ? "var(--optic)" : value >= 50 ? "#e9d34a" : "var(--clay)";
  return (
    <div className="ring flex-shrink-0" style={{ width: size, height: size,
      background: `conic-gradient(${col} ${value * 3.6}deg, var(--paper2) 0deg)` }}>
      <div className="ring" style={{ width: size - 10, height: size - 10, background: "#fff" }}>
        <span className="disp fw-800" style={{ fontSize: size * 0.29 }}>{value}</span>
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
    <h1 className="disp header-title header-title-margin">{title}</h1>
    {sub ? <p className="header-subtitle m-0">{sub}</p> : null}
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

// A card-shaped "nothing here yet" placeholder — Discover, Messages, and
// CourtsMap each used to hand-roll their own version of this same shape
// (centered muted text in a card, optionally with a bold title).
export const EmptyState = ({ title, children, className = "" }) => (
  <div className={`card p-16 bg-paper2 ${className}`}>
    {title ? <div className="disp text-center empty-state-title mb-6">{title}</div> : null}
    <div className="text-muted text-center text-13">{children}</div>
  </div>
);

export const Field = ({ label, children }) => (
  <div className="card card-field">
    <div className="text-label-mb">
      {label}
    </div>
    {children}
  </div>
);
