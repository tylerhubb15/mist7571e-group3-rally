import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Send, Wifi } from "lucide-react";
import { useConversations, useThread } from "../hooks/hooks.jsx";
import { Avatar, Header, Loading, ErrorNote, CharWarning } from "./Shared.jsx";
import { sanitizeText } from "../lib/textFilter.js";
import { useCharWarning } from "../hooks/useCharWarning.js";

const fmtTime = (iso) =>
  new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default function Messages({ myId, active, onOpenThread, onCloseThread }) {
  const { data: conversations, isLoading, error } = useConversations(myId);

  if (active) {
    return <Thread myId={myId} partner={active} onBack={onCloseThread} />;
  }

  return (
    <div>
      <Header eyebrow="Direct messages" title="Conversations" sub="Chat with potential hitting partners." />
      <ErrorNote error={error} label="Couldn't load conversations. Try again in a moment." />
      {isLoading ? <Loading label="Loading conversations…" /> : null}
      <div style={{ display: "grid", gap: 11 }}>
        {(conversations || []).map((c, i) => (
          <button key={c.partner.id} className="card lift rise" onClick={() => onOpenThread(c.partner)}
            style={{ padding: 16, animationDelay: `${i * 60}ms`, display: "flex", gap: 13, alignItems: "center",
              width: "100%", textAlign: "left", cursor: "pointer", border: "1.5px solid var(--ink)" }}>
            <div style={{ position: "relative" }}>
              <Avatar name={c.partner.name} size={46} />
              <span style={{ position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderRadius: 99,
                background: "var(--optic)", border: "2px solid #fff" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                <span className="disp" style={{ fontSize: 16, fontWeight: 800 }}>{c.partner.name}</span>
                <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{fmtTime(c.lastMessage.created_at)}</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: c.unread > 0 ? 700 : 500,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {(c.lastMessage.sender_id === myId ? "You: " : "") + c.lastMessage.body}
              </div>
            </div>
            {c.unread > 0 ? <div className="unread-dot" /> : null}
            <ChevronRight size={16} style={{ color: "var(--muted)" }} />
          </button>
        ))}
        {!isLoading && !error && !(conversations || []).length ? (
          <div className="card" style={{ padding: 16, textAlign: "center", background: "var(--paper2)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>
              More chats appear after you propose a hit — Discover a player first.
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Thread({ myId, partner, onBack }) {
  const { data: thread, isLoading, error, send, markRead } = useThread(myId, partner.id);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState(null);
  const [draftWarn, filterDraft] = useCharWarning(sanitizeText);
  const bottomRef = useRef(null);

  useEffect(() => { markRead(); }, [partner.id]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread]);

  const sendMsg = async () => {
    if (!draft.trim()) return;
    const body = draft.trim();
    setDraft("");
    setSendError(null);
    try {
      await send(body);
    } catch (err) {
      setSendError(err);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 200px)", minHeight: 400 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, paddingBottom: 14, borderBottom: "1.5px solid var(--ink)" }}>
        <button className="btn btn-ghost" style={{ padding: 7 }} onClick={onBack}><ChevronLeft size={18} /></button>
        <Avatar name={partner.name} size={38} />
        <div style={{ flex: 1 }}>
          <div className="disp" style={{ fontSize: 17, fontWeight: 800 }}>{partner.name}</div>
          {partner.ntrp ? <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{partner.ntrp} NTRP</div> : null}
        </div>
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: "var(--optic-d)" }}>
          <Wifi size={13} /> live
        </span>
      </div>

      <ErrorNote error={error} label="Couldn't load this conversation." />
      <ErrorNote error={sendError} label="Message didn't send — try again." />
      {isLoading ? <Loading label="Loading messages…" /> : null}

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingBottom: 12 }}>
        {(thread || []).map((m, i) => (
          <div key={m.id} className="rise" style={{ display: "flex", flexDirection: "column",
            alignItems: m.sender_id === myId ? "flex-end" : "flex-start", animationDelay: `${i * 30}ms` }}>
            <div className={m.sender_id === myId ? "bubble-me" : "bubble-them"}
              style={{ maxWidth: "80%", padding: "10px 14px", fontSize: 14, fontWeight: 500, lineHeight: 1.45 }}>
              {m.body}
            </div>
            <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, marginTop: 3, paddingInline: 4 }}>{fmtTime(m.created_at)}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ paddingTop: 12, borderTop: "1.5px solid var(--ink)" }}>
        <div style={{ display: "flex", gap: 9 }}>
          <input className="inp" placeholder="Message…" value={draft}
            onChange={(e) => setDraft(filterDraft(e.target.value))}
            onKeyDown={(e) => { if (e.key === "Enter") sendMsg(); }}
            style={{ flex: 1 }} />
          <button className="btn btn-o" style={{ padding: "10px 14px" }} onClick={sendMsg}><Send size={16} /></button>
        </div>
        <CharWarning show={draftWarn} />
      </div>
    </div>
  );
}
