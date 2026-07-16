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
    <div className="absolute modal-overlay" onClick={onClose}>
      <div className="flex-center modal-backdrop">
        <div className="card pop modal-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="flex-center-gap mb-6">
            <Avatar name={player.name} size={40} />
            <div>
              <div className="disp text-19 fw-800">Hit with {player.name.split(" ")[0]}</div>
              <div className="text-muted text-13">{player.ntrp} NTRP · {player.intent?.join(", ")}</div>
            </div>
          </div>
          <div className="divider my-14" />
          <div className="text-label mb-8">PICK A SHARED TIME</div>
          {slots.length ? (
            <div className="flex gap-6 flex-wrap mb-16">
              {slots.map((s) => (
                <button key={s} className={`slot ${slot === s ? "on" : ""}`} onClick={() => setSlot(s)}>
                  {s.replace("-", " ")}
                </button>
              ))}
            </div>
          ) : !me.slots?.length ? (
            <div className="mb-16">
              <div className="text-muted mb-8 text-13">
                You haven't set your weekly availability yet, so there's nothing to overlap with {player.name.split(" ")[0]}'s schedule.
              </div>
              <button className="btn btn-ghost border-ink" onClick={onGoToProfile}>
                Set availability in Profile
              </button>
            </div>
          ) : (
            <div className="text-muted mb-16 text-13">
              No overlapping times with {player.name.split(" ")[0]} yet — send a message first to find one.
            </div>
          )}
          <div className="text-label mb-8">COURT</div>
          <select className="inp mb-18" value={court} onChange={(e) => setCourt(e.target.value)}>
            {COURTS.map((c) => <option key={c}>{c}</option>)}
          </select>

          <div className="text-label mb-8">FORMAT</div>
          <div className={`flex gap-6 ${isDoubles ? "mb-16" : "mb-18"}`}>
            {FORMATS.map((f) => (
              <button key={f} className={`slot ${format === f ? "on" : ""}`} onClick={() => setFormat(f)}>{f}</button>
            ))}
          </div>

          {isDoubles ? (
            <>
              <div className="text-label mb-8">YOUR PARTNER</div>
              <select className="inp mb-16" value={proposerPartnerId}
                onChange={(e) => setProposerPartnerId(e.target.value)}>
                <option value="" disabled>Choose your partner…</option>
                {eligible(opponentPartnerId).map((p) => <option key={p.id} value={p.id}>{p.name} · {p.ntrp}</option>)}
              </select>
              <div className="text-label mb-8">{player.name.split(" ")[0]}'S PARTNER</div>
              <select className="inp mb-18" value={opponentPartnerId}
                onChange={(e) => setOpponentPartnerId(e.target.value)}>
                <option value="" disabled>Choose their partner…</option>
                {eligible(proposerPartnerId).map((p) => <option key={p.id} value={p.id}>{p.name} · {p.ntrp}</option>)}
              </select>
            </>
          ) : null}

          <ErrorNote error={error} label="Couldn't send that request — try again." />
          <div className="flex gap-10">
            <button className="btn btn-ghost btn-full" onClick={onClose}>Cancel</button>
            <button className="btn btn-o btn-full flex-2"
              disabled={!canSubmit || sending} onClick={submit}>
              <Send size={14} /> {sending ? "Sending…" : "Send request"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
