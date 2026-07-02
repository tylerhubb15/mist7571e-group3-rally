import React from "react";
import { Calendar as CalIcon, Check, Clock, MapPin, X } from "lucide-react";
import { Avatar, Header } from "./Shared.jsx";

const GROUPS = [
  { key: "incoming",  label: "Wants to hit with you", color: "var(--optic-d)" },
  { key: "pending",   label: "Awaiting reply",        color: "var(--clay)" },
  { key: "confirmed", label: "Confirmed",             color: "var(--optic)" },
];

export default function CalendarView({ sessions, setSessions }) {
  const act = (id, status) => setSessions((s) => s.map((x) => (x.id === id ? { ...x, status } : x)));
  const hasAny = sessions.some((s) => ["pending", "incoming", "confirmed"].includes(s.status));

  return (
    <div>
      <Header eyebrow="Booking calendar" title="Your sessions" sub="Propose, confirm, and lock in court time." />
      {GROUPS.map((g) => {
        const items = sessions.filter((s) => s.status === g.key);
        if (!items.length) return null;
        return (
          <div key={g.key} style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: 99, background: g.color, border: "1.3px solid var(--ink)" }} />
              <span className="disp" style={{ fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".02em" }}>{g.label}</span>
              <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 700 }}>{items.length}</span>
            </div>
            <div style={{ display: "grid", gap: 11 }}>
              {items.map((s) => (
                <div key={s.id} className="card rise" style={{ padding: 15 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Avatar name={s.player.name} />
                    <div style={{ flex: 1 }}>
                      <div className="disp" style={{ fontSize: 16, fontWeight: 800 }}>{s.player.name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, display: "flex", gap: 10, marginTop: 2 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Clock size={12} />{s.slot.replace("-", " ")}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 3 }}><MapPin size={12} />{s.court}</span>
                      </div>
                    </div>
                    <span className="tag" style={{ background: g.color }}>{s.player.ntrp}</span>
                  </div>
                  {g.key === "incoming" ? (
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button className="btn btn-y" style={{ flex: 1, justifyContent: "center" }} onClick={() => act(s.id, "confirmed")}>
                        <Check size={14} />Accept
                      </button>
                      <button className="btn btn-ghost" style={{ justifyContent: "center" }} onClick={() => act(s.id, "declined")}>
                        <X size={15} />
                      </button>
                    </div>
                  ) : null}
                  {g.key === "pending" ? (
                    <div style={{ marginTop: 10, fontSize: 13, color: "var(--muted)", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                      <Clock size={13} /> Waiting on {s.player.name.split(" ")[0]}…
                    </div>
                  ) : null}
                  {g.key === "confirmed" ? (
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink2)", display: "flex", alignItems: "center", gap: 5 }}>
                        <Check size={13} /> Locked in — see you out there
                      </span>
                      <button className="btn btn-ghost" style={{ padding: "5px 11px", fontSize: 13 }} onClick={() => act(s.id, "cancelled")}>Cancel</button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {!hasAny ? (
        <div className="card" style={{ padding: 28, textAlign: "center" }}>
          <CalIcon size={30} style={{ margin: "0 auto 10px" }} />
          <div className="disp" style={{ fontSize: 18, fontWeight: 800 }}>No sessions yet</div>
          <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>Head to Discover and propose a hit.</div>
        </div>
      ) : null}
    </div>
  );
}
