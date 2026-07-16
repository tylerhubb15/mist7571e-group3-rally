import React from "react";
import {
  Calendar as CalIcon,
  Check,
  Clock,
  MapPin,
  X,
  MessageCircle,
  Trophy,
} from "lucide-react";
import { Avatar, Header, Loading, ErrorNote } from "./Shared.jsx";

const GROUPS = [
  { key: "incoming", label: "Wants to hit with you", color: "var(--optic-d)" },
  { key: "pending", label: "Awaiting reply", color: "var(--clay)" },
  { key: "confirmed", label: "Confirmed", color: "var(--optic)" },
];

export default function CalendarView({
  sessions,
  isLoading,
  error,
  setStatus,
  setStatusError,
  onMessage,
  myId,
  results,
  onLogResult,
}) {
  if (isLoading) return <Loading label="Loading your sessions…" />;

  const list = sessions || [];
  // One result per session (session_id is unique on match_results) — a Map
  // gives O(1) lookups per row instead of an O(results) scan per session.
  const resultsBySession = new Map((results || []).map((r) => [r.session_id, r]));
  const resultFor = (sessionId) => resultsBySession.get(sessionId);
  const hasAny = list.some((s) =>
    ["pending", "incoming", "confirmed"].includes(s.uiStatus),
  );

  return (
    <div>
      <Header
        eyebrow="Booking calendar"
        title="Your sessions"
        sub="Propose, confirm, and lock in court time."
      />
      <ErrorNote
        error={error}
        label="Couldn't load sessions. Try again in a moment."
      />
      <ErrorNote
        error={setStatusError}
        label="Couldn't update that session. Try again."
      />
      {GROUPS.map((g) => {
        const items = list.filter((s) => s.uiStatus === g.key);
        if (!items.length) return null;
        return (
          <div key={g.key} className="mb-20">
            <div className="flex-center-gap mb-10">
              <span className="group-dot" style={{ background: g.color }} />
              <span className="disp group-label">
                {g.label}
              </span>
              <span className="group-count">
                {items.length}
              </span>
            </div>
            <div className="grid gap-11">
              {items.map((s) => {
                const otherTeam = s.otherTeam || [];
                const primary = otherTeam[0] || {};
                const otherNames = otherTeam.map((p) => p.name).join(" & ");
                const myPartner = (s.myTeam || []).find((p) => p.id !== myId);
                const slot = `${s.slot_day}-${s.slot_period}`;
                return (
                  <div key={s.id} className="card rise p-15">
                    <div className="flex-center-gap">
                      <Avatar name={primary.name || "?"} />
                      <div className="flex-1">
                        <div className="disp session-name items-center gap-6 flex-wrap">
                          {otherNames || "Unknown"}
                          {s.format === "Doubles" ? (
                            <span className="tag tag-doubles">
                              Doubles
                            </span>
                          ) : null}
                        </div>
                        <div className="text-muted text-12 flex gap-10 mt-2 flex-wrap">
                          <span className="items-center gap-3">
                            <Clock size={12} />
                            {slot.replace("-", " ")}
                          </span>
                          <span className="items-center gap-3">
                            <MapPin size={12} />
                            {s.court}
                          </span>
                          {myPartner ? (
                            <span>with {myPartner.name.split(" ")[0]}</span>
                          ) : null}
                        </div>
                      </div>
                      {otherTeam.length === 1 ? (
                        <span className="tag" style={{ background: g.color }}>
                          {primary.ntrp}
                        </span>
                      ) : null}
                      <button
                        className="btn btn-ghost btn-icon"
                        title={`Message ${primary.name}`}
                        onClick={() =>
                          onMessage({
                            id: primary.id,
                            name: primary.name,
                            ntrp: primary.ntrp,
                          })
                        }
                      >
                        <MessageCircle size={15} />
                      </button>
                    </div>
                    {g.key === "incoming" ? (
                       <div className="flex gap-8 mt-12">
                        <button
                          className="btn btn-y btn-full flex-1"
                          onClick={() =>
                            setStatus({ sessionId: s.id, status: "confirmed" })
                          }
                        >
                          <Check size={14} />
                          Accept
                        </button>
                        <button
                          className="btn btn-ghost justify-center"
                          onClick={() =>
                            setStatus({ sessionId: s.id, status: "declined" })
                          }
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ) : null}
                    {g.key === "pending" ? (
                      <div className="text-muted mt-10 text-13 items-center gap-5">
                        <Clock size={13} /> Waiting on{" "}
                        {otherNames.split(" ")[0]}…
                      </div>
                    ) : null}
                    {g.key === "confirmed" ? (
                      <div className="mt-10">
                        <div className="flex-between">
                          <span className="text-13 fw-700 text-ink2 items-center gap-5">
                            <Check size={13} /> Locked in — see you out there
                          </span>
                          <button
                            className="btn btn-ghost py-5 px-11 text-13"
                            onClick={() =>
                              setStatus({
                                sessionId: s.id,
                                status: "cancelled",
                              })
                            }
                          >
                            Cancel
                          </button>
                        </div>
                        {(() => {
                          const result = resultFor(s.id);
                          const scoreText = result
                           ? [
                                  result.set1_score,
                                  result.set2_score,
                                  result.set3_score,
                                ]
                                .filter(Boolean)
                                .join(", ")
                           : "";
                          const outcomeLabel =
                           result?.viewerOutcome === "won"
                                ? "You won"
                                : result?.viewerOutcome === "lost"
                                  ? "You lost"
                                  : "No winner logged";
                          return result ? (
                           <div className="text-muted mt-8 text-13 items-center gap-5">
                                <Trophy size={13} />
                                {outcomeLabel}
                                {scoreText ? ` · ${scoreText}` : ""}
                           </div>
                          ) : (
                           <button
                                className="btn btn-ghost mt-8 border-ink text-13 py-6 px-11"
                                onClick={() => onLogResult(s)}
                           >
                                <Trophy size={13} /> Log result
                           </button>
                          );
                        })()}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {!hasAny ? (
        <div className="card p-28">
          <div className="text-center">
            <CalIcon size={30} className="empty-state-icon" />
            <div className="disp empty-state-title">
              No sessions yet
            </div>
            <div className="text-muted text-13">
              Head to Discover and propose a hit.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
