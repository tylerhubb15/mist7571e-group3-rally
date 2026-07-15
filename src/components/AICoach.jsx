import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Send } from "lucide-react";
import { Header } from "./Shared.jsx";

const SUGGESTIONS = [
  "How do I improve my second serve?",
  "Tips for playing against a baseliner",
  "How should I approach a 4.0 player?",
  "What's the best way to finish a point at net?",
];

export default function AICoach({ me }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text) {
    const question = (text || input).trim();
    if (!question) return;
    setInput("");
    const next = [...messages, { role: "user", content: question }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch("/.netlify/functions/ai-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          message: question,
          history: messages,
          me: me ? { ntrp: me.ntrp } : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Request failed");
      setMessages([...next, { role: "coach", content: data.brief }]);
    } catch (err) {
      setMessages([...next, { role: "coach", content: `Sorry, something went wrong: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 180px)", minHeight: 400 }}>
      <Header eyebrow="AI Coach" title="Ask your coach" sub="Get personalised tips to level up your game." />

      {/* Chat messages */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingBottom: 8 }}>
        {messages.length === 0 ? (
          <div>
            <div className="card" style={{ padding: 16, textAlign: "center", marginBottom: 16 }}>
              <Sparkles size={28} style={{ margin: "0 auto 8px", display: "block", color: "var(--optic)" }} />
              <div className="disp" style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Your AI tennis coach</div>
              <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>
                Ask anything — technique, tactics, match prep, or how to beat a specific style.
              </div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--muted)", marginBottom: 8 }}>
              Try asking
            </div>
            <div style={{ display: "grid", gap: 7 }}>
              {SUGGESTIONS.map((s) => (
                <button key={s} className="btn btn-ghost" style={{ justifyContent: "flex-start", fontSize: 13, textAlign: "left", border: "1.5px solid var(--ink)" }}
                  onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "82%",
              padding: "10px 13px",
              borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
              background: m.role === "user" ? "var(--ink)" : "var(--paper2)",
              color: m.role === "user" ? "var(--paper)" : "var(--ink2)",
              fontSize: 14,
              fontWeight: 600,
              lineHeight: 1.6,
              border: m.role === "coach" ? "1.5px solid var(--ink)" : "none",
            }}>
              {m.role === "coach" ? (
                <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                  <Sparkles size={13} style={{ marginTop: 3, flexShrink: 0, color: "var(--optic)" }} />
                  <span>{m.content}</span>
                </div>
              ) : m.content}
            </div>
          </div>
        ))}

        {loading ? (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ padding: "10px 13px", borderRadius: "14px 14px 14px 4px", background: "var(--paper2)", border: "1.5px solid var(--ink)", display: "flex", alignItems: "center", gap: 6 }}>
              <Sparkles size={13} style={{ color: "var(--optic)" }} />
              <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>Thinking…</span>
            </div>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{ display: "flex", gap: 8, paddingTop: 10, borderTop: "2px solid var(--ink)" }}>
        <input
          className="input"
          style={{ flex: 1 }}
          placeholder="Ask your coach…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          disabled={loading}
          maxLength={300}
        />
        <button className="btn btn-o" style={{ padding: "0 14px" }} onClick={() => send()} disabled={loading || !input.trim()}>
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
