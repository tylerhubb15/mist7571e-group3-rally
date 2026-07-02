import React, { useState } from "react";
import { X } from "lucide-react";
import { COURT_LOCS, PLAYERS, ME } from "../data/mockData.js";
import { Avatar, Header } from "./Shared.jsx";

const SVG_W = 380;
const SVG_H = 300;
const PAD = 24;
const MIN_LNG = -83.45;
const LNG_SPAN = 0.16;
const MAX_LAT = 34.03;
const LAT_SPAN = 0.16;
const MI_PX = 28;

const toXY = (lat, lng) => ({
  x: ((lng - MIN_LNG) / LNG_SPAN) * (SVG_W - PAD * 2) + PAD,
  y: ((MAX_LAT - lat) / LAT_SPAN) * (SVG_H - PAD * 2) + PAD,
});
const USER_XY = toXY(ME.lat, ME.lng);

export default function CourtsMap() {
  const [selected, setSelected] = useState(null);
  const selCourt = COURT_LOCS.find((c) => c.id === selected);
  const playersHere = selCourt ? PLAYERS.filter((p) => p.home === selCourt.name) : [];

  return (
    <div>
      <Header eyebrow="Court finder" title="Courts near you" sub="Athens, GA · tap a pin for details" />
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} width="100%" style={{ display: "block", background: "#E8F0E5" }}>
          {Array.from({ length: 7 }, (_, i) => (
            <line key={`v${i}`} x1={PAD + ((SVG_W - PAD * 2) * i) / 6} y1={PAD}
              x2={PAD + ((SVG_W - PAD * 2) * i) / 6} y2={SVG_H - PAD}
              stroke="rgba(21,50,42,.1)" strokeWidth="1" />
          ))}
          {Array.from({ length: 6 }, (_, i) => (
            <line key={`h${i}`} x1={PAD} y1={PAD + ((SVG_H - PAD * 2) * i) / 5}
              x2={SVG_W - PAD} y2={PAD + ((SVG_H - PAD * 2) * i) / 5}
              stroke="rgba(21,50,42,.1)" strokeWidth="1" />
          ))}
          {[5, 10].map((mi) => (
            <circle key={mi} cx={USER_XY.x} cy={USER_XY.y} r={mi * MI_PX}
              fill="none" stroke="var(--ink)" strokeWidth="1" strokeDasharray="5 4" opacity=".2" />
          ))}
          {[5, 10].map((mi) => (
            <text key={`l${mi}`} x={USER_XY.x + mi * MI_PX + 3} y={USER_XY.y - 3}
              fontSize="9" fill="var(--ink)" opacity=".45" fontFamily="Hanken Grotesk" fontWeight="600">{mi} mi</text>
          ))}
          {COURT_LOCS.map((c) => {
            const { x, y } = toXY(c.lat, c.lng);
            const isSelected = selected === c.id;
            const pCount = PLAYERS.filter((p) => p.home === c.name).length;
            return (
              <g key={c.id} style={{ cursor: "pointer" }} onClick={() => setSelected(isSelected ? null : c.id)}>
                <circle cx={x} cy={y} r={isSelected ? 20 : 16} fill={isSelected ? "var(--clay)" : "var(--ink)"}
                  stroke="#fff" strokeWidth="2" style={{ transition: "r .2s" }} />
                <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle"
                  fontSize="10" fontWeight="800" fill={isSelected ? "#fff" : "var(--optic)"}
                  fontFamily="Bricolage Grotesque">{c.courts}</text>
                {pCount > 0 ? (
                  <g>
                    <circle cx={x + 10} cy={y - 10} r={7} fill="var(--optic)" stroke="var(--ink)" strokeWidth="1.5" />
                    <text x={x + 10} y={y - 10} textAnchor="middle" dominantBaseline="middle"
                      fontSize="8" fontWeight="800" fill="var(--ink)" fontFamily="Hanken Grotesk">{pCount}</text>
                  </g>
                ) : null}
                <text x={x} y={y + (isSelected ? 34 : 28)} textAnchor="middle" dominantBaseline="middle"
                  fontSize="8.5" fontWeight="700" fill="var(--ink)" opacity=".75"
                  fontFamily="Hanken Grotesk">{c.name.split(" ")[0]}</text>
              </g>
            );
          })}
          <circle cx={USER_XY.x} cy={USER_XY.y} r={9} fill="var(--optic)" stroke="var(--ink)" strokeWidth="2" />
          <text x={USER_XY.x} y={USER_XY.y} textAnchor="middle" dominantBaseline="middle"
            fontSize="9" fontWeight="800" fill="var(--ink)" fontFamily="Hanken Grotesk">ME</text>
        </svg>

        <div style={{ padding: "10px 14px", borderTop: "1.5px solid var(--ink)", background: "#fff",
          display: "flex", gap: 16, fontSize: 11, fontWeight: 700 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 12, height: 12, borderRadius: 99, background: "var(--ink)", display: "inline-block" }} />
            # Courts
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 12, height: 12, borderRadius: 99, background: "var(--optic)", border: "1px solid var(--ink)", display: "inline-block" }} />
            Players nearby
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 12, height: 12, borderRadius: 99, background: "var(--optic)", border: "1.5px solid var(--ink)", display: "inline-block" }} />
            You
          </span>
        </div>
      </div>

      {selCourt ? (
        <div className="card pop" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div className="disp" style={{ fontSize: 21, fontWeight: 800 }}>{selCourt.name}</div>
              <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600, marginTop: 3, display: "flex", gap: 10 }}>
                <span>{selCourt.courts} courts</span>
                <span>{selCourt.surfaces.join(" & ")}</span>
                {selCourt.lit ? <span style={{ color: "var(--optic-d)" }}>Lit</span> : null}
              </div>
            </div>
            <button className="btn btn-ghost" style={{ padding: 6 }} onClick={() => setSelected(null)}><X size={16} /></button>
          </div>
          <p style={{ fontSize: 14, margin: "0 0 13px", fontWeight: 500 }}>{selCourt.desc}</p>
          {playersHere.length > 0 ? (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".04em" }}>Players here</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {playersHere.map((p) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={p.name} size={32} />
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</span>
                    <span className="tag" style={{ background: "var(--optic)", marginLeft: "auto" }}>{p.ntrp}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="card" style={{ padding: 16, textAlign: "center", background: "var(--paper2)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>Tap a court pin to see details and nearby players.</div>
        </div>
      )}
    </div>
  );
}
