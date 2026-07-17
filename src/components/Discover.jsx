import React, { useState, useMemo } from "react";
import { MapPin, Target, ChevronRight, Zap, MessageCircle, Sparkles } from "lucide-react";
import { fetchAiBrief } from "../lib/aiBrief.js";

function PlayerBrief({ player, record }) {
  const [state, setState] = useState("idle");
  const [brief, setBrief] = useState("");

  async function fetch_brief() {
    setState("loading");
    try {
      const { brief } = await fetchAiBrief({
        mode: "matchup",
        player: {
          name: player.name,
          ntrp: player.ntrp,
          hand: player.hand || null,
          racket: player.racket || null,
          record,
        },
        court: player.home_court || null,
      });
      setBrief(brief);
      setState("done");
    } catch (err) {
      setBrief(err.message || "Something went wrong.");
      setState("error");
    }
  }

  if (state === "idle") return (
    <button className="btn btn-ghost border-ink" onClick={fetch_brief}>
      <Sparkles size={14} />AI Brief
    </button>
  );
  if (state === "loading") return (
    <span className="flex-center-gap text-13">
      <Sparkles size={13} />Generating…
    </span>
  );
  return (
    <div className="card mt-10 py-10 px-12">
      <div className="flex-center-gap mb-6 label-eyebrow">
        <Sparkles size={11} />AI Match Prep · {player.name}
      </div>
      <div className="text-13 fw-600 text-ink2 brief-text">{brief}</div>
      <button className="btn btn-ghost btn-sm mt-8" onClick={() => setState("idle")}>Dismiss</button>
    </div>
  );
}
import { useMatches, useMatchResults } from "../hooks/hooks.jsx";
import { scoreParts } from "../lib/matching.js";
import { ScoreRing, Avatar, Header, Loading, ErrorNote } from "./Shared.jsx";

export default function Discover({ me, onPropose, onMessage }) {
  const { data: matches, isLoading, error } = useMatches(me.id);
  // Already fetched/cached by CalendarView & Profile under the same query
  // key — this doesn't trigger a second network request, just reads
  // match history so the AI Brief can reference a real head-to-head
  // record instead of guessing.
  const { data: matchResults } = useMatchResults(me.id);
  const [open, setOpen] = useState(null);
  // Score each match once when matches/me actually change, instead of on
  // every render — expanding one card's detail panel (an `open` state
  // change) shouldn't recompute every other card's score breakdown.
  const scoredMatches = useMemo(
    () => (matches || []).map((p) => ({ ...p, parts: scoreParts(me, p) })),
    [matches, me]
  );

  const headToHead = (opponentId) => {
    const played = (matchResults || []).filter((r) => r.opponents.some((o) => o.id === opponentId));
    if (!played.length) return null;
    const won = played.filter((r) => r.viewerOutcome === "won").length;
    const lost = played.filter((r) => r.viewerOutcome === "lost").length;
    return `${won}-${lost}`;
  };

  return (
    <div>
      <Header eyebrow="Matching engine" title="Your best hits"
        sub={`${me.ntrp} NTRP · ${me.intent.join(", ")} · ${me.radius_mi} mi radius`} />

      <ErrorNote error={error} label={error ? `Couldn't load matches: ${error.message}` : undefined} />
      {isLoading ? <Loading label="Finding your best hits…" /> : null}

      {!isLoading && !error && matches?.length === 0 ? (
        <div className="card p-28">
          <div className="disp text-center empty-state-title">No matches yet</div>
          <div className="text-muted text-center text-13">
            {me.lat === null
              ? "Set your location in the Courts tab so we can find players near you."
              : "Widen your search radius or add more availability in Profile."}
          </div>
        </div>
      ) : null}

      <div className="grid gap-13">
        {scoredMatches.map((p, i) => {
          const parts = p.parts;
          return (
            <div key={p.profile_id} className="card lift rise p-16" style={{ animationDelay: `${i * 55}ms` }}>
              <div className="flex-center-gap">
                <ScoreRing value={Math.round(p.match_score)} />
                <div className="flex-1 min-width-0">
                  <div className="flex-start gap-8 flex-wrap mb-5">
                    <Avatar name={p.name} size={34} />
                    <span className="disp text-18 fw-800">{p.name}</span>
                    <span className="tag tag-optic">{p.ntrp}</span>
                  </div>
                  <div className="text-muted text-12 mt-5 flex gap-10 flex-wrap">
                    <span className="items-center gap-3">
                      <MapPin size={12} />{p.distance_mi?.toFixed(1)} mi · {p.home_court || "No home court set"}
                    </span>
                    <span className="items-center gap-3"><Target size={12} />{p.intent?.join(", ")}</span>
                  </div>
                </div>
                <button className="btn btn-ghost btn-icon" onClick={() => setOpen(open === p.profile_id ? null : p.profile_id)}>
                  <ChevronRight size={16} className={`chevron-rotate ${open === p.profile_id ? "rotated" : ""}`} />
                </button>
              </div>

              {open === p.profile_id ? (
                <div className="pop mt-12 mb-12">
                  <div className="divider mb-13" />
                  <div className="grid grid-cols-2 gap-8 mb-13">
                    {Object.entries(parts).map(([k, v]) => (
                      <div key={k}>
                        <div className="flex-between text-11 fw-700 mb-3">
                          <span>{k}</span><span>{v}%</span>
                        </div>
                        <div className="meter-track">
                          <div className={`meter-fill ${v >= 70 ? "meter-fill-high" : "meter-fill-low"}`} style={{ width: `${v}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-label mb-6">SHARED SLOTS</div>
                  <div className="flex gap-6 flex-wrap mb-13">
                    {p.shared_slots?.length
                      ? p.shared_slots.map((s) => <span key={s} className="slot match">{s.replace("-", " ")}</span>)
                      : <span className="text-muted text-13">No overlap — message them to find a time.</span>}
                  </div>
                  <div className="flex gap-8 flex-wrap">
                    <button className="btn btn-ghost border-ink"
                      onClick={() => onMessage({ id: p.profile_id, name: p.name, ntrp: p.ntrp })}>
                      <MessageCircle size={14} />Message
                    </button>
                    <button className="btn btn-y" onClick={() => onPropose(p)}><Zap size={14} />Propose hit</button>
                    <PlayerBrief player={p} record={headToHead(p.profile_id)} />
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
