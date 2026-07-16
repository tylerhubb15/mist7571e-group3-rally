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
  const resultFor = (sessionId) =>
    (results || []).find((r) => r.session_id === sessionId);
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
            <div className="flex-center-gap" style={{ marginBottom: 10 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 99,
                  background: g.color,
                  border: "1.3px solid var(--ink)",
                }}
              />
              <span
                className="disp"
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: ".02em",
                }}
              >
                {g.label}
              </span>
              <span
                style={{ fontSize: 13, color: "var(--muted)", fontWeight: 700 }}
              >
                {items.length}
              </span>
            </div>
            <div style={{ display: "grid", gap: 11 }}>
              {items.map((s) => {
                const otherTeam = s.otherTeam || [];
                const primary = otherTeam[0] || {};
                const otherNames = otherTeam.map((p) => p.name).join(" & ");
                const myPartner = (s.myTeam || []).find((p) => p.id !== myId);
                const slot = `${s.slot_day}-${s.slot_period}`;
                return (
                  <div key={s.id} className="card rise" style={{ padding: 15 }}>
                    <div className="flex-center-gap">
                      <Avatar name={primary.name || "?"} />
                      <div className="flex-1">
                        <div
                          className="disp"
                          style={{
                            fontSize: 16,
                            fontWeight: 800,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            flexWrap: "wrap",
                          }}
                        >
                          {otherNames || "Unknown"}
                          {s.format === "Doubles" ? (
                            <span
                              className="tag"
                              style={{
                                background: "var(--paper2)",
                                fontSize: 9,
                              }}
                            >
                              Doubles
                            </span>
                          ) : null}
                        </div>
                        <div
                          className="text-muted"
                          style={{
                            fontSize: 12,
                            display: "flex",
                            gap: 10,
                            marginTop: 2,
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 3,
                            }}
                          >
                            <Clock size={12} />
                            {slot.replace("-", " ")}
                          </span>
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 3,
                            }}
                          >
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
                       <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <button
                          className="btn btn-y btn-full"
                          style={{ flex: 1 }}
                          onClick={() =>
                            setStatus({ sessionId: s.id, status: "confirmed" })
                          }
                        >
                          <Check size={14} />
                          Accept
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{ justifyContent: "center" }}
                          onClick={() =>
                            setStatus({ sessionId: s.id, status: "declined" })
                          }
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ) : null}
                    {g.key === "pending" ? (
                      <div className="text-muted" style={{
                           marginTop: 10,
                        fontSize: 13,
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                      }}>
                        <Clock size={13} /> Waiting on{" "}
                        {otherNames.split(" ")[0]}…
                      </div>
                    ) : null}
                    {g.key === "confirmed" ? (
                      <div style={{ marginTop: 10 }}>
                        <div className="flex-between">
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: "var(--ink2)",
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                            }}
                          >
                            <Check size={13} /> Locked in — see you out there
                          </span>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: "5px 11px", fontSize: 13 }}
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
                           <div className="text-muted" style={{
                                 marginTop: 8,
                                fontSize: 13,
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                           }}>
                                <Trophy size={13} />
                                {outcomeLabel}
                                {scoreText ? ` · ${scoreText}` : ""}
                           </div>
                          ) : (
                           <button
                                className="btn btn-ghost"
                                style={{
                                  marginTop: 8,
                                  border: "1.5px solid var(--ink)",
                                  fontSize: 13,
                                  padding: "6px 11px",
                                }}
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
        <div className="card" style={{ padding: 28 }}>
          <div style={{ textAlign: "center" }}>
            <CalIcon size={30} style={{ margin: "0 auto 10px", display: "block" }} />
            <div className="disp" style={{ fontSize: 18, fontWeight: 800 }}>
              No sessions yet
            </div>
            <div className="text-muted" style={{ fontSize: 13 }}>
              Head to Discover and propose a hit.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
