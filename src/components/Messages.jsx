import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Send, Wifi } from "lucide-react";
import { PLAYERS, SEED_MESSAGES } from "../data/mockData.js";
import { Avatar, Header } from "./Shared.jsx";

export default function Messages() {
  const [msgs, setMsgs] = useState(SEED_MESSAGES);
  const [activeId, setActive] = useState(null);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeId, msgs]);

  const convoPlayers = PLAYERS.filter((p) => [1, 6].includes(p.id));
  const lastMsg = (pid) => {
    const thread = msgs[pid];
    return thread ? thread[thread.length - 1] : null;
  };
  const unreadOf = (pid) => {
    const thread = msgs[pid];
    return thread ? thread.filter((m) => m.from === "them" && !m.read).length : 0;
  };

  const sendMsg = () => {
    if (!draft.trim()) return;
    setMsgs((m) => ({
      ...m,
      [activeId]: [...(m[activeId] || []), { from: "me", text: draft.trim(), ts: "just now" }],
    }));
    setDraft("");
  };

  if (activeId !== null) {
    const player = PLAYERS.find((p) => p.id === activeId);
    const thread = msgs[activeId] || [];
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 200px)", minHeight: 400 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, paddingBottom: 14, borderBottom: "1.5px solid var(--ink)" }}>
          <button className="btn btn-ghost" style={{ padding: 7 }} onClick={() => setActive(null)}><ChevronLeft size={18} /></button>
          <Avatar name={player.name} size={38} />
          <div style={{ flex: 1 }}>
            <div className="disp" style={{ fontSize: 17, fontWeight: 800 }}>{player.name}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{player.ntrp} NTRP · {player.home}</div>
          </div>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: "var(--optic-d)" }}>
            <Wifi size={13} /> online
          </span>
        </div>
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingBottom: 12 }}>
          {thread.map((m, i) => (
            <div key={`${activeId}-${i}`} className="rise" style={{ display: "flex", flexDirection: "column",
              alignItems: m.from === "me" ? "flex-end" : "flex-start", animationDelay: `${i * 30}ms` }}>
              <div className={m.from === "me" ? "bubble-me" : "bubble-them"}
                style={{ maxWidth: "80%", padding: "10px 14px", fontSize: 14, fontWeight: 500, lineHeight: 1.45 }}>
                {m.text}
              </div>
              <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, marginTop: 3, paddingInline: 4 }}>{m.ts}</span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div style={{ display: "flex", gap: 9, paddingTop: 12, borderTop: "1.5px solid var(--ink)" }}>
          <input className="inp" placeholder="Message…" value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") sendMsg(); }}
            style={{ flex: 1 }} />
          <button className="btn btn-o" style={{ padding: "10px 14px" }} onClick={sendMsg}><Send size={16} /></button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header eyebrow="Direct messages" title="Conversations" sub="Chat with potential hitting partners." />
      <div style={{ display: "grid", gap: 11 }}>
        {convoPlayers.map((p, i) => {
          const last = lastMsg(p.id);
          const unread = unreadOf(p.id);
          return (
            <button key={p.id} className="card lift rise" onClick={() => setActive(p.id)}
              style={{ padding: 16, animationDelay: `${i * 60}ms`, display: "flex", gap: 13, alignItems: "center",
                width: "100%", textAlign: "left", cursor: "pointer", border: "1.5px solid var(--ink)" }}>
              <div style={{ position: "relative" }}>
                <Avatar name={p.name} size={46} />
                <span style={{ position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderRadius: 99,
                  background: "var(--optic)", border: "2px solid #fff" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                  <span className="disp" style={{ fontSize: 16, fontWeight: 800 }}>{p.name}</span>
                  <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{last ? last.ts : ""}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: unread > 0 ? 700 : 500,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {last ? (last.from === "me" ? "You: " : "") + last.text : "Start the conversation"}
                </div>
              </div>
              {unread > 0 ? <div className="unread-dot" /> : null}
              <ChevronRight size={16} style={{ color: "var(--muted)" }} />
            </button>
          );
        })}
        <div className="card" style={{ padding: 16, textAlign: "center", background: "var(--paper2)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>
            More chats appear after you propose a hit — Discover a player first.
          </div>
        </div>
      </div>
    </div>
  );
}
