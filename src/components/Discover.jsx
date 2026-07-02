import React, { useState, useMemo } from "react";
import { MapPin, Target, ChevronRight, Zap } from "lucide-react";
import { PLAYERS } from "../data/mockData.js";
import { scoreOf } from "../lib/matching.js";
import { ScoreRing, Avatar, Header } from "./Shared.jsx";

export default function Discover({ me, onPropose }) {
  const ranked = useMemo(
    () => PLAYERS.map((p) => ({ ...p, s: scoreOf(me, p) })).sort((a, b) => b.s.total - a.s.total),
    [me]
  );
  const [open, setOpen] = useState(null);

  return (
    <div>
      <Header eyebrow="Matching engine" title="Your best hits"
        sub={`${me.ntrp} NTRP · ${me.intent} · ${me.radius} mi radius`} />
      <div style={{ display: "grid", gap: 13 }}>
        {ranked.map((p, i) => (
          <div key={p.id} className="card lift rise" style={{ padding: 16, animationDelay: `${i * 55}ms` }}>
            <div style={{ display: "flex", gap: 13, alignItems: "center" }}>
              <ScoreRing value={p.s.total} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Avatar name={p.name} size={34} />
                  <span className="disp" style={{ fontSize: 18, fontWeight: 800 }}>{p.name}</span>
                  <span className="tag" style={{ background: "var(--optic)" }}>{p.ntrp}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 5, display: "flex", gap: 10, flexWrap: "wrap", fontWeight: 600 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}><MapPin size={12} />{p.dist} mi · {p.home}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Target size={12} />{p.intent}</span>
                </div>
              </div>
              <button className="btn btn-ghost" style={{ padding: 8 }} onClick={() => setOpen(open === p.id ? null : p.id)}>
                <ChevronRight size={16} style={{ transform: open === p.id ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
              </button>
            </div>

            {open === p.id ? (
              <div className="pop" style={{ marginTop: 13 }}>
                <div className="divider" style={{ margin: "0 0 13px" }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 13 }}>
                  {Object.entries(p.s.parts).map(([k, v]) => (
                    <div key={k}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, marginBottom: 3 }}>
                        <span>{k}</span><span>{v}%</span>
                      </div>
                      <div style={{ height: 6, background: "var(--paper2)", borderRadius: 99, border: "1px solid var(--ink)" }}>
                        <div style={{ width: `${v}%`, height: "100%", background: v >= 70 ? "var(--optic)" : "var(--clay)", borderRadius: 99 }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>SHARED SLOTS</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 13 }}>
                  {p.s.overlap.length
                    ? p.s.overlap.map((s) => <span key={s} className="slot match">{s.replace("-", " ")}</span>)
                    : <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>No overlap — you can still propose.</span>}
                </div>
                <button className="btn btn-y" onClick={() => onPropose(p)}><Zap size={14} />Propose hit</button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
