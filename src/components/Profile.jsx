import React, { useState, useEffect } from "react";
import { Trophy, Pencil, Plus } from "lucide-react";
import { DAYS, PERIODS, INTENTS, FORMATS, HANDS, COURTS } from "../data/mockData.js";
import { Header, Field, ErrorNote, Avatar } from "./Shared.jsx";

const fmtDate = (d) =>
  new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
const formatSets = (r) => [r.set1_score, r.set2_score, r.set3_score].filter(Boolean).join(", ");
const names = (people) => people.map((p) => p.name).join(" & ");

export default function Profile({ me, update, updating, updateError, matchResults, onAddMatch, onEditMatch }) {
  const stats = (matchResults || []).reduce(
    (acc, r) => {
      acc.played++;
      if (r.viewerOutcome === "won") acc.won++;
      else if (r.viewerOutcome === "lost") acc.lost++;
      else acc.noDecision++;
      return acc;
    },
    { played: 0, won: 0, lost: 0, noDecision: 0 }
  );

  const [firstNameDraft, setFirstNameDraft] = useState(me.first_name);
  const [lastNameDraft, setLastNameDraft] = useState(me.last_name || "");
  const [racketDraft, setRacketDraft] = useState(me.racket || "");
  const [bioDraft, setBioDraft] = useState(me.bio || "");
  useEffect(() => setFirstNameDraft(me.first_name), [me.first_name]);
  useEffect(() => setLastNameDraft(me.last_name || ""), [me.last_name]);
  useEffect(() => setRacketDraft(me.racket || ""), [me.racket]);
  useEffect(() => setBioDraft(me.bio || ""), [me.bio]);

  const saveTextField = (field, draft, original) => {
    if (draft !== (original || "")) update({ fields: { [field]: draft } });
  };

  const toggleSlot = (s) => {
    const slots = me.slots.includes(s) ? me.slots.filter((x) => x !== s) : [...me.slots, s];
    update({ slots });
  };

  const toggleIntent = (it) => {
    const has = me.intent.includes(it);
    if (has && me.intent.length === 1) return; // keep at least one selected
    const intent = has ? me.intent.filter((x) => x !== it) : [...me.intent, it];
    update({ fields: { intent } });
  };

  const toggleFormat = (f) => {
    const has = me.formats.includes(f);
    if (has && me.formats.length === 1) return; // keep at least one selected
    const formats = has ? me.formats.filter((x) => x !== f) : [...me.formats, f];
    update({ fields: { formats } });
  };

  return (
    <div>
      <Header eyebrow="Your profile" title="Game settings" sub="Drives every match you see." />
      <ErrorNote error={updateError} label="Couldn't save that change — try again." />

      <div className="card" style={{ padding: 20, marginBottom: 16, background: "var(--ink)", color: "var(--paper)", boxShadow: "4px 5px 0 var(--clay)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="ring disp" style={{ width: 52, height: 52, background: "var(--optic)", color: "var(--ink)", fontWeight: 800, fontSize: 20 }}>ME</div>
          <div>
            <div className="disp" style={{ fontSize: 22, fontWeight: 800 }}>{me.name}</div>
            <div style={{ fontSize: 13, opacity: 0.85, fontWeight: 600 }}>{me.racket || "No racket set"} · {me.hand}-handed</div>
            <div style={{ fontSize: 12, opacity: 0.65, fontWeight: 600, marginTop: 2 }}>{me.home_court || "No home court set"}</div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "center" }}>
            <div className="disp" style={{ fontSize: 28, fontWeight: 800, color: "var(--optic)" }}>{me.ntrp}</div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em" }}>NTRP</div>
          </div>
        </div>
      </div>

      <Field label="Match history">
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: stats.played ? 16 : 12 }}>
          {stats.played === 0 ? (
            <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600, flex: 1 }}>
              No matches yet — log one from a confirmed session in Calendar, or add a past match by hand.
            </div>
          ) : (
            <div style={{ display: "flex", gap: 22, flexWrap: "wrap", flex: 1 }}>
              <Stat label="Played" value={stats.played} />
              <Stat label="Won" value={stats.won} />
              <Stat label="Lost" value={stats.lost} />
              {stats.noDecision ? <Stat label="No decision" value={stats.noDecision} /> : null}
            </div>
          )}
          <button className="btn btn-o" style={{ padding: "7px 12px", fontSize: 13, flexShrink: 0 }} onClick={onAddMatch}>
            <Plus size={14} />Add match
          </button>
        </div>

        {stats.played > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(matchResults || []).map((r) => {
              const outcome = r.viewerOutcome === "won" ? "Won" : r.viewerOutcome === "lost" ? "Lost" : "No decision";
              const outcomeColor = outcome === "Won" ? "var(--optic-d)" : outcome === "Lost" ? "var(--clay)" : "var(--muted)";
              const scoreText = formatSets(r);
              const myPartner = r.myTeam.find((p) => p.name !== me.name);
              const hasFreeformPlayer = Boolean(r.opponent_name || r.opponent2_name || r.partner_name);
              return (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
                  borderTop: "1.5px solid var(--paper2)" }}>
                  <Avatar name={r.opponents[0]?.name || "?"} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      vs {r.opponents.length ? names(r.opponents) : "Unknown"}
                      {r.format === "Doubles" ? <span className="tag" style={{ background: "var(--paper2)", fontSize: 9 }}>Doubles</span> : null}
                      <span style={{ color: outcomeColor, fontWeight: 800, fontSize: 11, textTransform: "uppercase" }}>
                        <Trophy size={10} style={{ display: "inline", marginRight: 2, verticalAlign: -1 }} />{outcome}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
                      {fmtDate(r.played_at)}
                      {scoreText ? ` · ${scoreText}` : ""}
                      {myPartner ? ` · with ${myPartner.name.split(" ")[0]}` : ""}
                      {hasFreeformPlayer ? " · not on Rally" : ""}
                    </div>
                  </div>
                  {r.canEdit ? (
                    <button className="btn btn-ghost" style={{ padding: 6, flexShrink: 0 }} title="Edit match"
                      onClick={() => onEditMatch(r)}>
                      <Pencil size={14} />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </Field>

      <Field label="Your name">
        <div style={{ display: "flex", gap: 9 }}>
          <input className="inp" placeholder="First name" value={firstNameDraft}
            onChange={(e) => setFirstNameDraft(e.target.value)}
            onBlur={() => saveTextField("first_name", firstNameDraft, me.first_name)} />
          <input className="inp" placeholder="Last name" value={lastNameDraft}
            onChange={(e) => setLastNameDraft(e.target.value)}
            onBlur={() => saveTextField("last_name", lastNameDraft, me.last_name)} />
        </div>
      </Field>

      <Field label={`Skill rating — ${me.ntrp} NTRP`}>
        <input type="range" min="2.5" max="5.0" step="0.5" value={me.ntrp}
          onChange={(e) => update({ fields: { ntrp: Number(e.target.value) } })}
          style={{ width: "100%", accentColor: "var(--clay)" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>
          <span>2.5</span><span>5.0</span>
        </div>
      </Field>

      <Field label="Home court">
        <select className="inp" value={me.home_court || ""} onChange={(e) => update({ fields: { home_court: e.target.value } })}>
          <option value="" disabled>Choose a court…</option>
          {COURTS.map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>

      <Field label="Racket">
        <input className="inp" placeholder="e.g. Wilson Blade 100 v10" value={racketDraft}
          onChange={(e) => setRacketDraft(e.target.value)}
          onBlur={() => saveTextField("racket", racketDraft, me.racket)} />
      </Field>

      <Field label="Dominant hand">
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {HANDS.map((h) => (
            <button key={h} className={`slot ${me.hand === h ? "on" : ""}`}
              style={{ padding: "7px 12px" }} onClick={() => update({ fields: { hand: h } })}>{h}</button>
          ))}
        </div>
      </Field>

      <Field label="What you play (pick one or both)">
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {FORMATS.map((f) => (
            <button key={f} className={`slot ${me.formats.includes(f) ? "on" : ""}`}
              style={{ padding: "7px 12px" }} onClick={() => toggleFormat(f)}>{f}</button>
          ))}
        </div>
      </Field>

      <Field label="What you're after (pick as many as apply)">
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {INTENTS.map((it) => (
            <button key={it} className={`slot ${me.intent.includes(it) ? "on" : ""}`}
              style={{ padding: "7px 12px" }} onClick={() => toggleIntent(it)}>{it}</button>
          ))}
        </div>
      </Field>

      <Field label="About you">
        <textarea className="inp" rows={3} placeholder="Playing style, what you're looking for, anything else worth knowing."
          style={{ resize: "vertical", fontFamily: "inherit" }} value={bioDraft}
          onChange={(e) => setBioDraft(e.target.value)}
          onBlur={() => saveTextField("bio", bioDraft, me.bio)} />
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

      {updating ? <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Saving…</div> : null}
    </div>
  );
}

const Stat = ({ label, value }) => (
  <div>
    <div className="disp" style={{ fontSize: 22, fontWeight: 800 }}>{value}</div>
    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</div>
  </div>
);
