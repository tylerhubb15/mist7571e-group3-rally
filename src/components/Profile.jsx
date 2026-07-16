import React, { useState } from "react";
import { Trophy, Pencil, Plus, X, Check } from "lucide-react";
import { DAYS, PERIODS, INTENTS, FORMATS, HANDS, COURTS } from "../data/mockData.js";
import { Header, Field, ErrorNote, SuccessNote, CharWarning, Avatar } from "./Shared.jsx";
import { sanitizeText, sanitizeName } from "../lib/textFilter.js";
import { useCharWarning } from "../hooks/useCharWarning.js";

const fmtDate = (d) =>
  new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
const formatSets = (r) => [r.set1_score, r.set2_score, r.set3_score].filter(Boolean).join(", ");
const names = (people) => people.map((p) => p.name).join(" & ");

export default function Profile({ me, updateAsync, updating, updateError, matchResults, onAddMatch, onEditMatch }) {
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

  const [editing, setEditing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [firstNameDraft, setFirstNameDraft] = useState(me.first_name);
  const [lastNameDraft, setLastNameDraft] = useState(me.last_name || "");
  const [racketDraft, setRacketDraft] = useState(me.racket || "");
  const [bioDraft, setBioDraft] = useState(me.bio || "");
  const [ntrpDraft, setNtrpDraft] = useState(me.ntrp);
  const [homeCourtDraft, setHomeCourtDraft] = useState(me.home_court || "");
  const [handDraft, setHandDraft] = useState(me.hand);
  const [formatsDraft, setFormatsDraft] = useState(me.formats);
  const [intentDraft, setIntentDraft] = useState(me.intent);
  const [slotsDraft, setSlotsDraft] = useState(me.slots);

  const [firstNameWarn, filterFirstName] = useCharWarning(sanitizeName);
  const [lastNameWarn, filterLastName] = useCharWarning(sanitizeName);
  const [racketWarn, filterRacket] = useCharWarning(sanitizeText);
  const [bioWarn, filterBio] = useCharWarning(sanitizeText);

  const startEdit = () => {
    setFirstNameDraft(me.first_name);
    setLastNameDraft(me.last_name || "");
    setRacketDraft(me.racket || "");
    setBioDraft(me.bio || "");
    setNtrpDraft(me.ntrp);
    setHomeCourtDraft(me.home_court || "");
    setHandDraft(me.hand);
    setFormatsDraft(me.formats);
    setIntentDraft(me.intent);
    setSlotsDraft(me.slots);
    setSaveError(null);
    setJustSaved(false);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setSaveError(null);
  };

  const saveAll = async () => {
    setSaveError(null);
    try {
      await updateAsync({
        fields: {
          first_name: firstNameDraft,
          last_name: lastNameDraft,
          racket: racketDraft,
          bio: bioDraft,
          ntrp: ntrpDraft,
          home_court: homeCourtDraft,
          hand: handDraft,
          formats: formatsDraft,
          intent: intentDraft,
        },
        slots: slotsDraft,
      });
      setEditing(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
    } catch (err) {
      setSaveError(err);
    }
  };

  const toggleSlot = (s) => {
    if (!editing) return;
    setSlotsDraft((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const toggleIntent = (it) => {
    if (!editing) return;
    setIntentDraft((prev) => {
      const has = prev.includes(it);
      if (has && prev.length === 1) return prev; // keep at least one selected
      return has ? prev.filter((x) => x !== it) : [...prev, it];
    });
  };

  const toggleFormat = (f) => {
    if (!editing) return;
    setFormatsDraft((prev) => {
      const has = prev.includes(f);
      if (has && prev.length === 1) return prev; // keep at least one selected
      return has ? prev.filter((x) => x !== f) : [...prev, f];
    });
  };

  const slots = editing ? slotsDraft : me.slots;
  const intent = editing ? intentDraft : me.intent;
  const formats = editing ? formatsDraft : me.formats;

  return (
    <div>
      <Header eyebrow="Your profile" title="Game settings" sub="Drives every match you see." />

      {!editing ? (
        <div className="card card-section">
          <button className="btn btn-o btn-full" onClick={startEdit}>
            <Pencil size={14} />Edit profile
          </button>
        </div>
      ) : null}

      <div className="card card-lg card-dark">
        <div className="flex-center-gap">
          <div className="ring disp avatar-optic" style={{ width: 52, height: 52, fontSize: 20 }}>ME</div>
          <div>
            <div className="disp header-title">{me.name}</div>
            <div style={{ fontSize: 13, opacity: 0.85, fontWeight: 600 }}>{me.racket || "No racket set"} · {me.hand}-handed</div>
            <div style={{ fontSize: 12, opacity: 0.65, fontWeight: 600, marginTop: 2 }}>{me.home_court || "No home court set"}</div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "center" }}>
            <div className="profile-ntrp">{me.ntrp}</div>
            <div className="text-tiny">NTRP</div>
          </div>
        </div>
      </div>

      <Field label="Match history">
        <div className="flex-center-gap" style={{ marginBottom: stats.played ? 16 : 12 }}>
          {stats.played === 0 ? (
            <div className="profile-stat-label">
              No matches yet — log one from a confirmed session in Calendar, or add a past match by hand.
            </div>
          ) : (
            <div className="profile-stat-row">
              <Stat label="Played" value={stats.played} />
              <Stat label="Won" value={stats.won} />
              <Stat label="Lost" value={stats.lost} />
              {stats.noDecision ? <Stat label="No decision" value={stats.noDecision} /> : null}
            </div>
          )}
          <button className="btn btn-o btn-sm flex-shrink-0" onClick={onAddMatch}>
            <Plus size={14} />Add match
          </button>
        </div>

        {stats.played > 0 ? (
          <div className="profile-match-list">
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
                  <div className="profile-match-item">
                    <div className="profile-match-header">
                      vs {r.opponents.length ? names(r.opponents) : "Unknown"}
                      {r.format === "Doubles" ? <span className="tag" style={{ background: "var(--paper2)", fontSize: 9 }}>Doubles</span> : null}
                      <span className="profile-outcome" style={{ color: outcomeColor }}>
                        <Trophy size={10} style={{ display: "inline", marginRight: 2, verticalAlign: -1 }} />{outcome}
                      </span>
                    </div>
                    <div className="profile-match-subtext">
                      {fmtDate(r.played_at)}
                      {scoreText ? ` · ${scoreText}` : ""}
                      {myPartner ? ` · with ${myPartner.name.split(" ")[0]}` : ""}
                      {hasFreeformPlayer ? " · not on Rally" : ""}
                    </div>
                  </div>
                  {r.canEdit ? (
                    <button className="btn btn-ghost btn-icon flex-shrink-0" title="Edit match"
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
          <div className="flex-1">
            <input className="inp inp-disabled" placeholder="First name" disabled={!editing}
              style={{ opacity: editing ? 1 : 0.6 }}
              value={editing ? firstNameDraft : me.first_name}
              onChange={(e) => setFirstNameDraft(filterFirstName(e.target.value))} />
            <CharWarning show={firstNameWarn} />
          </div>
          <div className="flex-1">
            <input className="inp inp-disabled" placeholder="Last name" disabled={!editing}
              style={{ opacity: editing ? 1 : 0.6 }}
              value={editing ? lastNameDraft : (me.last_name || "")}
              onChange={(e) => setLastNameDraft(filterLastName(e.target.value))} />
            <CharWarning show={lastNameWarn} />
          </div>
        </div>
      </Field>

      <Field label={`Skill rating — ${editing ? ntrpDraft : me.ntrp} NTRP`}>
        <input type="range" min="2.5" max="5.0" step="0.5" disabled={!editing}
          value={editing ? ntrpDraft : me.ntrp}
          onChange={(e) => setNtrpDraft(Number(e.target.value))}
          className="accent-clay"
          style={{ width: "100%", opacity: editing ? 1 : 0.6 }} />
        <div className="profile-slot-label">
          <span>2.5</span><span>5.0</span>
        </div>
      </Field>

      <Field label="Home court">
        <select className="inp inp-disabled" disabled={!editing} style={{ opacity: editing ? 1 : 0.6 }}
          value={editing ? homeCourtDraft : (me.home_court || "")}
          onChange={(e) => setHomeCourtDraft(e.target.value)}>
          <option value="" disabled>Choose a court…</option>
          {COURTS.map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>

      <Field label="Racket">
        <input className="inp inp-disabled" placeholder="e.g. Wilson Blade 100 v10" disabled={!editing}
          style={{ opacity: editing ? 1 : 0.6 }}
          value={editing ? racketDraft : (me.racket || "")}
          onChange={(e) => setRacketDraft(filterRacket(e.target.value))} />
        <CharWarning show={racketWarn} />
      </Field>

      <Field label="Dominant hand">
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", opacity: editing ? 1 : 0.6, pointerEvents: editing ? "auto" : "none" }}>
          {HANDS.map((h) => (
            <button key={h} className={`slot ${(editing ? handDraft : me.hand) === h ? "on" : ""}`}
              style={{ padding: "7px 12px" }} onClick={() => setHandDraft(h)}>{h}</button>
          ))}
        </div>
      </Field>

      <Field label="What you play (pick one or both)">
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", opacity: editing ? 1 : 0.6, pointerEvents: editing ? "auto" : "none" }}>
          {FORMATS.map((f) => (
            <button key={f} className={`slot ${formats.includes(f) ? "on" : ""}`}
              style={{ padding: "7px 12px" }} onClick={() => toggleFormat(f)}>{f}</button>
          ))}
        </div>
      </Field>

      <Field label="What you're after (pick as many as apply)">
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", opacity: editing ? 1 : 0.6, pointerEvents: editing ? "auto" : "none" }}>
          {INTENTS.map((it) => (
            <button key={it} className={`slot ${intent.includes(it) ? "on" : ""}`}
              style={{ padding: "7px 12px" }} onClick={() => toggleIntent(it)}>{it}</button>
          ))}
        </div>
      </Field>

      <Field label="About you">
        <textarea className="inp profile-bio-disabled" rows={3} placeholder="Playing style, what you're looking for, anything else worth knowing."
          disabled={!editing} style={{ opacity: editing ? 1 : 0.6 }}
          value={editing ? bioDraft : (me.bio || "")}
          onChange={(e) => setBioDraft(filterBio(e.target.value))} />
        <CharWarning show={bioWarn} />
      </Field>

      <Field label="Weekly availability">
        <div style={{ display: "grid", gridTemplateColumns: "auto repeat(3,1fr)", gap: 5, alignItems: "center",
          opacity: editing ? 1 : 0.6, pointerEvents: editing ? "auto" : "none" }}>
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
                  <button key={s} className={`slot ${slots.includes(s) ? "on" : ""}`}
                    style={{ height: 28, padding: 0 }} onClick={() => toggleSlot(s)}>
                    {slots.includes(s) ? "●" : ""}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </Field>

      <ErrorNote error={saveError || updateError} label="Couldn't save that change — try again." />
      <SuccessNote show={justSaved} label="Profile saved." />

      {editing ? (
        <div className="card card-section flex-center" style={{ gap: 10 }}>
          <button className="btn btn-y flex-1" style={{ justifyContent: "center" }} disabled={updating} onClick={saveAll}>
            <Check size={15} />{updating ? "Saving…" : "Save changes"}
          </button>
          <button className="btn btn-ghost flex-1" style={{ justifyContent: "center", border: "1.5px solid var(--ink)" }}
            disabled={updating} onClick={cancelEdit}>
            <X size={15} />Cancel
          </button>
        </div>
      ) : null}
    </div>
  );
}

const Stat = ({ label, value }) => (
  <div>
    <div className="disp" style={{ fontSize: 22, fontWeight: 800 }}>{value}</div>
    <div className="text-tiny" style={{ textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</div>
  </div>
);
