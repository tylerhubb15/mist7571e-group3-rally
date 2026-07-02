import React, { useState } from "react";
import { Send } from "lucide-react";
import { COURTS } from "../data/mockData.js";
import { Avatar } from "./Shared.jsx";

export default function ProposeModal({ player, me, onClose, onConfirm }) {
  const overlap = player.slots.filter((s) => me.slots.includes(s));
  const [slot, setSlot] = useState(overlap[0] || player.slots[0]);
  const [court, setCourt] = useState(player.home);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(21,50,42,.5)",
      zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div className="card pop" onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 460, padding: 22, borderRadius: "20px 20px 0 0", boxShadow: "none", borderBottom: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <Avatar name={player.name} size={40} />
          <div>
            <div className="disp" style={{ fontSize: 19, fontWeight: 800 }}>Hit with {player.name.split(" ")[0]}</div>
            <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>{player.ntrp} NTRP · {player.intent}</div>
          </div>
        </div>
        <div className="divider" style={{ margin: "14px 0" }} />
        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 7 }}>PICK A TIME</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {player.slots.map((s) => (
            <button key={s} className={`slot ${slot === s ? "on" : ""}`} onClick={() => setSlot(s)}>
              {s.replace("-", " ")}{overlap.includes(s) ? " ✓" : ""}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 7 }}>COURT</div>
        <select className="inp" value={court} onChange={(e) => setCourt(e.target.value)} style={{ marginBottom: 18 }}>
          {COURTS.map((c) => <option key={c}>{c}</option>)}
        </select>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>Cancel</button>
          <button className="btn btn-o" style={{ flex: 2, justifyContent: "center" }}
            onClick={() => onConfirm({ player, slot, court })}>
            <Send size={14} /> Send request
          </button>
        </div>
      </div>
    </div>
  );
}
