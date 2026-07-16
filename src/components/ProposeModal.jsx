import React, { useState } from "react";
import { Send } from "lucide-react";
import { COURTS, FORMATS } from "../data/mockData.js";
import { Avatar, ErrorNote } from "./Shared.jsx";
import { useAllProfiles } from "../hooks/hooks.jsx";

export default function ProposeModal({ player, me, onClose, onConfirm, sending, error, onGoToProfile }) {
  const slots = player.shared_slots || [];
  const [slot, setSlot] = useState(slots[0] || "");
  const [court, setCourt] = useState(player.home_court || COURTS[0]);
  const [format, setFormat] = useState("Singles");
  const [proposerPartnerId, setProposerPartnerId] = useState("");
  const [opponentPartnerId, setOpponentPartnerId] = useState("");

  const { data: allPlayers } = useAllProfiles();
  const eligible = (excludeId) =>
    (allPlayers || []).filter((p) => p.id !== me.id && p.id !== player.profile_id && p.id !== excludeId);

  const isDoubles = format === "Doubles";
  const canSubmit = !!slot && (!isDoubles || (proposerPartnerId && opponentPartnerId));

  const submit = () => {
    if (!canSubmit) return;
    const [slotDay, slotPeriod] = slot.split("-");
    onConfirm({
      partnerId: player.profile_id, slotDay, slotPeriod, court,
      format,
      proposerPartnerId: isDoubles ? proposerPartnerId : null,
      opponentPartnerId: isDoubles ? opponentPartnerId : null,
    });
  };

  return (
    <div className="absolute" style={{ inset: 0, background: "rgba(21,50,42,.5)", zIndex: 50 }} onClick={onClose}>
      <div className="flex-center" style={{ height: "100vh", alignItems: "flex-end", justifyContent: "center" }}>
        <div className="card pop" onClick={(e) => e.stopPropagation()}
          style={{ width: "100%", maxWidth: 460, padding: 22, borderRadius: "20px 20px 0 0", boxShadow: "none", borderBottom: "none" }}>
          <div className="flex-center-gap mb-6">
            <Avatar name={player.name} size={40} />
            <div>
              <div className="disp" style={{ fontSize: 19, fontWeight: 800 }}>Hit with {player.name.split(" ")[0]}</div>
              <div className="text-muted" style={{ fontSize: 13 }}>{player.ntrp} NTRP · {player.intent?.join(", ")}</div>
            </div>
          </div>
          <div className="divider" style={{ margin: "14px 0" }} />
          <div className="text-label mb-8">PICK A SHARED TIME</div>
          {slots.length ? (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
              {slots.map((s) => (
                <button key={s} className={`slot ${slot === s ? "on" : ""}`} onClick={() => setSlot(s)}>
                  {s.replace("-", " ")}
                </button>
              ))}
            </div>
          ) : !me.slots?.length ? (
            <div className="mb-16">
              <div className="text-muted mb-8" style={{ fontSize: 13 }}>
                You haven't set your weekly availability yet, so there's nothing to overlap with {player.name.split(" ")[0]}'s schedule.
              </div>
              <button className="btn btn-ghost" style={{ border: "1.5px solid var(--ink)" }} onClick={onGoToProfile}>
                Set availability in Profile
              </button>
            </div>
          ) : (
            <div className="text-muted mb-16" style={{ fontSize: 13 }}>
              No overlapping times with {player.name.split(" ")[0]} yet — send a message first to find one.
            </div>
          )}
          <div className="text-label mb-8">COURT</div>
          <select className="inp" value={court} onChange={(e) => setCourt(e.target.value)} style={{ marginBottom: 18 }}>
            {COURTS.map((c) => <option key={c}>{c}</option>)}
          </select>

          <div className="text-label mb-8">FORMAT</div>
          <div style={{ display: "flex", gap: 6, marginBottom: isDoubles ? 16 : 18 }}>
            {FORMATS.map((f) => (
              <button key={f} className={`slot ${format === f ? "on" : ""}`} onClick={() => setFormat(f)}>{f}</button>
            ))}
          </div>

          {isDoubles ? (
            <>
              <div className="text-label mb-8">YOUR PARTNER</div>
              <select className="inp" value={proposerPartnerId}
                onChange={(e) => setProposerPartnerId(e.target.value)} style={{ marginBottom: 16 }}>
                <option value="" disabled>Choose your partner…</option>
                {eligible(opponentPartnerId).map((p) => <option key={p.id} value={p.id}>{p.name} · {p.ntrp}</option>)}
              </select>
              <div className="text-label mb-8">{player.name.split(" ")[0]}'S PARTNER</div>
              <select className="inp" value={opponentPartnerId}
                onChange={(e) => setOpponentPartnerId(e.target.value)} style={{ marginBottom: 18 }}>
                <option value="" disabled>Choose their partner…</option>
                {eligible(proposerPartnerId).map((p) => <option key={p.id} value={p.id}>{p.name} · {p.ntrp}</option>)}
              </select>
            </>
          ) : null}

          <ErrorNote error={error} label="Couldn't send that request — try again." />
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ghost btn-full" onClick={onClose}>Cancel</button>
            <button className="btn btn-o btn-full" style={{ flex: 2 }}
              disabled={!canSubmit || sending} onClick={submit}>
              <Send size={14} /> {sending ? "Sending…" : "Send request"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
