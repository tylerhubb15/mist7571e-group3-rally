import React from "react";
import { DAYS, PERIODS, INTENTS } from "../data/mockData.js";
import { Header, Field } from "./Shared.jsx";

export default function Profile({ me, setMe }) {
  const toggleSlot = (s) =>
    setMe((m) => ({ ...m, slots: m.slots.includes(s) ? m.slots.filter((x) => x !== s) : [...m.slots, s] }));

  return (
    <div>
      <Header eyebrow="Your profile" title="Game settings" sub="Drives every match you see." />
      <div className="card" style={{ padding: 20, marginBottom: 16, background: "var(--ink)", color: "var(--paper)", boxShadow: "4px 5px 0 var(--clay)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="ring disp" style={{ width: 52, height: 52, background: "var(--optic)", color: "var(--ink)", fontWeight: 800, fontSize: 20 }}>ME</div>
          <div>
            <div className="disp" style={{ fontSize: 22, fontWeight: 800 }}>{me.name}</div>
            <div style={{ fontSize: 13, opacity: 0.85, fontWeight: 600 }}>{me.racket} · {me.hand}-handed</div>
            <div style={{ fontSize: 12, opacity: 0.65, fontWeight: 600, marginTop: 2 }}>{me.home}</div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "center" }}>
            <div className="disp" style={{ fontSize: 28, fontWeight: 800, color: "var(--optic)" }}>{me.ntrp}</div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em" }}>NTRP</div>
          </div>
        </div>
      </div>

      <Field label={`Skill rating — ${me.ntrp} NTRP`}>
        <input type="range" min="2.5" max="5.0" step="0.5" value={me.ntrp}
          onChange={(e) => setMe({ ...me, ntrp: Number(e.target.value) })}
          style={{ width: "100%", accentColor: "var(--clay)" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>
          <span>2.5</span><span>5.0</span>
        </div>
      </Field>

      <Field label={`Search radius — ${me.radius} mi`}>
        <input type="range" min="3" max="25" step="1" value={me.radius}
          onChange={(e) => setMe({ ...me, radius: Number(e.target.value) })}
          style={{ width: "100%", accentColor: "var(--clay)" }} />
      </Field>

      <Field label="What you're after">
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {INTENTS.map((it) => (
            <button key={it} className={`slot ${me.intent === it ? "on" : ""}`}
              style={{ padding: "7px 12px" }} onClick={() => setMe({ ...me, intent: it })}>{it}</button>
          ))}
        </div>
      </Field>

      <Field label="Weekly availability">
        <div style={{ display: "grid", gridTemplateColumns: "auto repeat(3,1fr)", gap: 5, alignItems: "center" }}>
          <span />
          {PERIODS.map((p) => (
            <div key={p} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "var(--muted)" }}>{p}</div>
          ))}
          {DAYS.map((d) => (
            <React.Fragment key={d}>
              <span style={{ fontSize: 11, fontWeight: 700 }}>{d}</span>
              {PERIODS.map((p) => {
                const s = `${d}-${p}`;
                return (
                  <button key={s} className={`slot ${me.slots.includes(s) ? "on" : ""}`}
                    style={{ height: 28, padding: 0 }} onClick={() => toggleSlot(s)}>
                    {me.slots.includes(s) ? "●" : ""}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </Field>
    </div>
  );
}
