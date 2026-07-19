import React, { useState } from "react";
import { Trophy, X } from "lucide-react";
import { Avatar, ErrorNote, CharWarning } from "./Shared.jsx";
import { useAllProfiles } from "../hooks/hooks.jsx";
import { FORMATS } from "../data/mockData.js";
import { sanitizeText } from "../lib/textFilter.js";
import { useCharWarning } from "../hooks/useCharWarning.js";

const today = () => new Date().toISOString().slice(0, 10);
// A slot defaults to picking from Rally users — freeform only when
// editing an existing row that already has a name and no id (an unset
// *optional* slot on a fresh or partially-filled entry has neither, and
// should still default to "rally" rather than assume freeform).
const slotFrom = (id, name) => ({ mode: id ? "rally" : name ? "freeform" : "rally", id: id || "", name: name || "" });

function PlayerSlot({ label, required, slot, setSlot, others, excludeIds }) {
  const available = others.filter((p) => !excludeIds.includes(p.id));
  const [nameWarn, filterName] = useCharWarning(sanitizeText);
  return (
    <div className="mb-14">
      <div className="text-11 fw-700 mb-7">
        {label}{required ? "" : " (OPTIONAL)"}
      </div>
      <div className="flex gap-6 mb-8">
        <button type="button" className={`slot ${slot.mode === "rally" ? "on" : ""}`}
          onClick={() => setSlot({ ...slot, mode: "rally" })}>On Rally</button>
        <button type="button" className={`slot ${slot.mode === "freeform" ? "on" : ""}`}
          onClick={() => setSlot({ ...slot, mode: "freeform" })}>Someone else</button>
      </div>
      {slot.mode === "rally" ? (
        <select className="inp" value={slot.id} onChange={(e) => setSlot({ ...slot, id: e.target.value })}>
          <option value="">{required ? "Choose a player…" : "None"}</option>
          {available.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.ntrp}</option>)}
        </select>
      ) : (
        <>
          <input className="inp" placeholder="Their name" value={slot.name}
            onChange={(e) => setSlot({ ...slot, name: filterName(e.target.value) })} />
          <CharWarning show={nameWarn} />
        </>
      )}
    </div>
  );
}

/**
 * Handles three flows through one form:
 *  - `session` set, no `match`  → logging the result of a confirmed
 *    session (singles or doubles — all players fixed by the session)
 *  - neither set                → hand-logging a past match, singles or
 *    doubles, each of the 3 "other side" slots (opponent 1, opponent 2,
 *    your partner) independently either an existing Rally user or a
 *    typed name
 *  - `match` set                → editing an existing result, any of the above
 *
 * Winner is tracked as a mode-agnostic tri-state ('me' | 'opponent' |
 * 'none') and only converted to the right DB shape at submit time:
 * winner_id for the one case with exactly one identifiable profile to
 * point at (singles, session-linked or vs. a Rally user), outcome
 * ("did my side win") for everything else — doubles, or a freeform
 * singles opponent.
 */
export default function MatchHistoryModal({ me, session, match, onClose, onConfirm, sending, error }) {
  const isEdit = !!match;
  const linkedToSession = isEdit ? match.session_id !== null : !!session;
  const { data: allPlayers } = useAllProfiles();
  const others = (allPlayers || []).filter((p) => p.id !== me.id);

  const initialFormat = linkedToSession ? (isEdit ? match.format : session.format) : (isEdit ? match.format : "Singles");
  const [format, setFormat] = useState(initialFormat);

  const manualSeed = isEdit && !linkedToSession ? match : null;
  const [opp1Slot, setOpp1Slot] = useState(slotFrom(manualSeed?.opponent_id, manualSeed?.opponent_name));
  const [opp2Slot, setOpp2Slot] = useState(slotFrom(manualSeed?.opponent2_id, manualSeed?.opponent2_name));
  const [partnerSlot, setPartnerSlot] = useState(slotFrom(manualSeed?.partner_id, manualSeed?.partner_name));

  const initialWinner = isEdit
    ? (match.viewerOutcome === "won" ? "me" : match.viewerOutcome === "lost" ? "opponent" : "none")
    : "me";
  const [winner, setWinner] = useState(initialWinner);

  const [set1, setSet1] = useState(isEdit ? match.set1_score || "" : "");
  const [set2, setSet2] = useState(isEdit ? match.set2_score || "" : "");
  const [set3, setSet3] = useState(isEdit ? match.set3_score || "" : "");
  const [playedAt, setPlayedAt] = useState(isEdit ? match.played_at : today());

  // Fixed team info when linked to a session — from sessions.list() for
  // create, or the resolved myTeam/opponents on the row for edit.
  const fixedOtherTeam = linkedToSession ? (isEdit ? match.opponents : session.otherTeam) || [] : [];
  const fixedTeammate = linkedToSession
    ? ((isEdit ? match.myTeam : session.myTeam) || []).find((p) => p.id !== me.id)
    : null;

  const slotDisplay = (slot) =>
    slot.mode === "rally" ? others.find((p) => p.id === slot.id) : (slot.name.trim() ? { name: slot.name.trim() } : null);
  const opp1 = linkedToSession ? fixedOtherTeam[0] : slotDisplay(opp1Slot);
  const opp2 = linkedToSession ? fixedOtherTeam[1] : (format === "Doubles" ? slotDisplay(opp2Slot) : null);
  const partner = linkedToSession ? fixedTeammate : (format === "Doubles" ? slotDisplay(partnerSlot) : null);
  const opponentsDisplay = [opp1, opp2].filter(Boolean);

  const canSubmit = linkedToSession ? true : !!opp1;
  // winner_id only makes sense with exactly one identifiable profile —
  // singles, and either session-linked or a Rally-user opponent.
  const usesWinnerId = format === "Singles" && (linkedToSession || opp1Slot.mode === "rally");

  const excludeIds = (skip) => [opp1Slot.id, opp2Slot.id, partnerSlot.id].filter((id) => id && id !== skip);

  const submit = () => {
    if (!canSubmit) return;
    const set1Score = set1.trim() || null;
    const set2Score = set2.trim() || null;
    const set3Score = set3.trim() || null;

    let winnerId = null, outcome = null;
    if (usesWinnerId) {
      const oppId = linkedToSession ? fixedOtherTeam[0]?.id : opp1Slot.id;
      winnerId = winner === "me" ? me.id : winner === "opponent" ? oppId : null;
    } else {
      outcome = winner === "me" ? "won" : winner === "opponent" ? "lost" : "none";
    }

    if (isEdit) {
      const fields = { set1_score: set1Score, set2_score: set2Score, set3_score: set3Score, played_at: playedAt };
      if (linkedToSession) {
        fields.winner_id = winnerId;
      } else {
        fields.format = format;
        fields.winner_id = winnerId;
        fields.outcome = outcome;
        fields.opponent_id = opp1Slot.mode === "rally" ? (opp1Slot.id || null) : null;
        fields.opponent_name = opp1Slot.mode === "freeform" ? (opp1Slot.name.trim() || null) : null;
        fields.opponent2_id = format === "Doubles" && opp2Slot.mode === "rally" ? (opp2Slot.id || null) : null;
        fields.opponent2_name = format === "Doubles" && opp2Slot.mode === "freeform" ? (opp2Slot.name.trim() || null) : null;
        fields.partner_id = format === "Doubles" && partnerSlot.mode === "rally" ? (partnerSlot.id || null) : null;
        fields.partner_name = format === "Doubles" && partnerSlot.mode === "freeform" ? (partnerSlot.name.trim() || null) : null;
      }
      onConfirm({ id: match.id, fields });
    } else if (session) {
      onConfirm({ sessionId: session.id, winnerId, outcome, set1Score, set2Score, set3Score, playedAt });
    } else {
      onConfirm({
        format,
        opponentId: opp1Slot.mode === "rally" ? opp1Slot.id : null,
        opponentName: opp1Slot.mode === "freeform" ? opp1Slot.name.trim() : null,
        opponent2Id: format === "Doubles" && opp2Slot.mode === "rally" ? opp2Slot.id : null,
        opponent2Name: format === "Doubles" && opp2Slot.mode === "freeform" ? opp2Slot.name.trim() : null,
        partnerId: format === "Doubles" && partnerSlot.mode === "rally" ? partnerSlot.id : null,
        partnerName: format === "Doubles" && partnerSlot.mode === "freeform" ? partnerSlot.name.trim() : null,
        winnerId, outcome,
        set1Score, set2Score, set3Score, playedAt,
      });
    }
  };

  const youLabel = format === "Doubles" && partner ? `You & ${partner.name.split(" ")[0]}` : "You";
  const themLabel = opponentsDisplay.length ? opponentsDisplay.map((p) => p.name.split(" ")[0]).join(" & ") : "Opponent";

  return (
    <div className="absolute modal-overlay" onClick={onClose}>
      <div className="flex-center modal-backdrop">
        <div className="card pop modal-sheet modal-sheet-scroll" onClick={(e) => e.stopPropagation()}>
          <div className="flex-center-gap mb-4">
            {opp1 ? <Avatar name={opp1.name} size={40} />
              : <div className="ring avatar-placeholder" />}
            <div className="flex-1">
              <div className="disp header-title">
                {isEdit ? "Edit match" : session ? `Log result vs ${themLabel}` : "Log a past match"}
              </div>
              <div className="text-muted text-small">Stats only — doesn't change anyone's NTRP.</div>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
          </div>
          <div className="divider my-14" />

          {!linkedToSession ? (
            <>
              <div className="text-label mb-8">FORMAT</div>
              <div className="flex gap-6 mb-16">
                {FORMATS.map((f) => (
                  <button key={f} className={`slot ${format === f ? "on" : ""}`} onClick={() => setFormat(f)}>{f}</button>
                ))}
              </div>
            </>
          ) : null}

          {linkedToSession ? (
            <div className="mb-16">
              <div className="text-label mb-8">OPPONENT{opponentsDisplay.length > 1 ? "S" : ""}</div>
              <div className="text-14 fw-700">
                {themLabel}
                <span className="text-muted text-small"> · from a booked session, can't change</span>
              </div>
              {partner ? (
                <div className="text-muted text-small mt-8">Your partner: {partner.name}</div>
              ) : null}
            </div>
          ) : (
            <>
              <PlayerSlot label="Opponent 1" required slot={opp1Slot} setSlot={setOpp1Slot}
                others={others} excludeIds={excludeIds(opp1Slot.id)} />
              {format === "Doubles" ? (
                <>
                  <PlayerSlot label="Opponent 2" slot={opp2Slot} setSlot={setOpp2Slot}
                    others={others} excludeIds={excludeIds(opp2Slot.id)} />
                  <PlayerSlot label="Your partner" slot={partnerSlot} setSlot={setPartnerSlot}
                    others={others} excludeIds={excludeIds(partnerSlot.id)} />
                </>
              ) : null}
            </>
          )}

          <div className="text-label mb-8">DATE PLAYED</div>
          <input type="date" className="inp mb-16" value={playedAt} max={today()}
            onChange={(e) => setPlayedAt(e.target.value)} />

          <div className="text-label mb-8">WHO WON?</div>
          <div className="flex gap-6 flex-wrap mb-16">
            <button className={`slot ${winner === "me" ? "on" : ""}`} onClick={() => setWinner("me")}>{youLabel}</button>
            <button className={`slot ${winner === "opponent" ? "on" : ""}`} disabled={!opp1}
              onClick={() => opp1 && setWinner("opponent")}>{themLabel}</button>
            <button className={`slot ${winner === "none" ? "on" : ""}`} onClick={() => setWinner("none")}>No winner / practice</button>
          </div>

          <div className="text-label mb-8">SCORE (OPTIONAL)</div>
          <div className="flex gap-8 mb-18">
            <input className="inp" placeholder="Set 1 — 6-4" value={set1} onChange={(e) => setSet1(e.target.value)} />
            <input className="inp" placeholder="Set 2 — 6-3" value={set2} onChange={(e) => setSet2(e.target.value)} />
            <input className="inp" placeholder="Set 3 / TB — 10-7" value={set3} onChange={(e) => setSet3(e.target.value)} />
          </div>

          <ErrorNote error={error} label={error ? `Couldn't save that match — ${error.message}` : undefined} />
          <div className="flex gap-10">
            <button className="btn btn-ghost btn-full" onClick={onClose}>Cancel</button>
            <button className="btn btn-o btn-full flex-2" disabled={sending || !canSubmit} onClick={submit}>
              <Trophy size={14} /> {sending ? "Saving…" : isEdit ? "Save changes" : session ? "Save result" : "Add match"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
