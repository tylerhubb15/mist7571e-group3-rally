import React, { useState } from "react";
import { MapPin, Target, ChevronRight, Zap, MessageCircle } from "lucide-react";
import { useMatches } from "../hooks/hooks.jsx";
import { scoreParts } from "../lib/matching.js";
import { ScoreRing, Avatar, Header, Loading, ErrorNote } from "./Shared.jsx";

export default function Discover({ me, onPropose, onMessage }) {
  const { data: matches, isLoading, error } = useMatches(me.id);
  const [open, setOpen] = useState(null);

  return (
    <div>
      <Header eyebrow="Matching engine" title="Your best hits"
        sub={`${me.ntrp} NTRP · ${me.intent.join(", ")} · ${me.radius_mi} mi radius`} />

      <ErrorNote error={error} label={error ? `Couldn't load matches: ${error.message}` : undefined} />
      {isLoading ? <Loading label="Finding your best hits…" /> : null}

      {!isLoading && !error && matches?.length === 0 ? (
        <div className="card" style={{ padding: 28, textAlign: "center" }}>
          <div className="disp" style={{ fontSize: 18, fontWeight: 800 }}>No matches yet</div>
          <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>
            {me.lat == null
              ? "Set your location in the Courts tab so we can find players near you."
              : "Widen your search radius or add more availability in Profile."}
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 13 }}>
        {(matches || []).map((p, i) => {
          const parts = scoreParts(me, p);
          return (
            <div key={p.profile_id} className="card lift rise" style={{ padding: 16, animationDelay: `${i * 55}ms` }}>
              <div style={{ display: "flex", gap: 13, alignItems: "center" }}>
                <ScoreRing value={Math.round(p.match_score)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <Avatar name={p.name} size={34} />
                    <span className="disp" style={{ fontSize: 18, fontWeight: 800 }}>{p.name}</span>
                    <span className="tag" style={{ background: "var(--optic)" }}>{p.ntrp}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 5, display: "flex", gap: 10, flexWrap: "wrap", fontWeight: 600 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <MapPin size={12} />{p.distance_mi?.toFixed(1)} mi · {p.home_court || "No home court set"}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Target size={12} />{p.intent?.join(", ")}</span>
                  </div>
                </div>
                <button className="btn btn-ghost" style={{ padding: 8 }} onClick={() => setOpen(open === p.profile_id ? null : p.profile_id)}>
                  <ChevronRight size={16} style={{ transform: open === p.profile_id ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
                </button>
              </div>

              {open === p.profile_id ? (
                <div className="pop" style={{ marginTop: 13 }}>
                  <div className="divider" style={{ margin: "0 0 13px" }} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 13 }}>
                    {Object.entries(parts).map(([k, v]) => (
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
                    {p.shared_slots?.length
                      ? p.shared_slots.map((s) => <span key={s} className="slot match">{s.replace("-", " ")}</span>)
                      : <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>No overlap — message them to find a time.</span>}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-ghost" style={{ border: "1.5px solid var(--ink)" }}
                      onClick={() => onMessage({ id: p.profile_id, name: p.name, ntrp: p.ntrp })}>
                      <MessageCircle size={14} />Message
                    </button>
                    <button className="btn btn-y" onClick={() => onPropose(p)}><Zap size={14} />Propose hit</button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
