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
      <div className="message-container">
        {(conversations || []).map((c, i) => (
          <button key={c.partner.id} className="card lift rise message-card" onClick={() => onOpenThread(c.partner)}
            style={{ animationDelay: `${i * 60}ms` }}>
            <div className="relative">
              <Avatar name={c.partner.name} size={46} />
              <span className="avatar-status" />
            </div>
            <div className="flex-1 min-width-0">
              <div className="flex-between mb-2">
                <span className="disp text-16 fw-800">{c.partner.name}</span>
                <span className="message-status">{fmtTime(c.lastMessage.created_at)}</span>
              </div>
              <div className={`message-body ${c.unread > 0 ? 'unread' : ''}`}>
                {(c.lastMessage.sender_id === myId ? "You: " : "") + c.lastMessage.body}
              </div>
            </div>
            {c.unread > 0 ? <div className="unread-dot" /> : null}
            <ChevronRight size={16} className="color-muted" />
          </button>
        ))}
        {!isLoading && !error && !(conversations || []).length ? (
          <div className="card card-section text-center bg-paper2">
            <div className="text-muted">
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
    <div className="flex-col messages-thread-shell">
      <div className="thread-header">
        <button className="btn btn-ghost btn-icon" onClick={onBack}><ChevronLeft size={18} /></button>
        <Avatar name={partner.name} size={38} />
        <div className="flex-1">
          <div className="disp thread-title">{partner.name}</div>
          {partner.ntrp ? <div className="text-small color-muted">{partner.ntrp} NTRP</div> : null}
        </div>
        <span className="thread-status">
          <Wifi size={13} /> live
        </span>
      </div>

      <ErrorNote error={error} label="Couldn't load this conversation." />
      <ErrorNote error={sendError} label="Message didn't send — try again." />
      {isLoading ? <Loading label="Loading messages…" /> : null}

      <div className="flex-1 flex-col gap-10 pb-12 overflow-y-auto">
        {(thread || []).map((m, i) => (
          <div key={m.id} className={`rise flex-col ${m.sender_id === myId ? "flex-end" : "flex-start"}`} style={{ animationDelay: `${i * 30}ms` }}>
            <div className={`${m.sender_id === myId ? "bubble-me" : "bubble-them"} msg-bubble`}>
              {m.body}
            </div>
            <span className="msg-timestamp">{fmtTime(m.created_at)}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="pt-12 border-top-ink">
        <div className="flex gap-9">
          <input className="inp flex-1" placeholder="Message…" value={draft}
            onChange={(e) => setDraft(filterDraft(e.target.value))}
            onKeyDown={(e) => { if (e.key === "Enter") sendMsg(); }} />
          <button className="btn btn-o py-10 px-14" onClick={sendMsg}><Send size={16} /></button>
        </div>
        <CharWarning show={draftWarn} />
      </div>
    </div>
  );
}
