import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Send } from "lucide-react";
import { Header } from "./Shared.jsx";
import { fetchAiBrief } from "../lib/aiBrief.js";

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
    const next = [...messages, { role: "user", content: question, id: crypto.randomUUID() }];
    setMessages(next);
    setLoading(true);
    try {
      const { brief } = await fetchAiBrief({
        mode: "chat",
        message: question,
        history: messages,
        me: me ? { ntrp: me.ntrp } : undefined,
      });
      setMessages([...next, { role: "coach", content: brief, id: crypto.randomUUID() }]);
    } catch (err) {
      setMessages([...next, { role: "coach", content: `Sorry, something went wrong: ${err.message}`, id: crypto.randomUUID() }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-col coach-shell">
      <Header eyebrow="AI Coach" title="Ask your coach" sub="Get personalised tips to level up your game." />

      {/* Chat messages */}
      <div className="flex-col flex-1 coach-messages">
        {messages.length === 0 ? (
          <div>
            <div className="card mb-16 p-16">
              <Sparkles size={28} className="coach-hero-icon" />
              <div className="disp coach-hero-title">Your AI tennis coach</div>
              <div className="text-muted text-13">
                Ask anything — technique, tactics, match prep, or how to beat a specific style.
              </div>
            </div>
            <div className="text-muted label-eyebrow mb-8">
              Try asking
            </div>
            <div className="grid gap-7">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="btn btn-ghost suggestion-btn"
                  onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`coach-bubble ${m.role === "user" ? "coach-bubble-user" : "coach-bubble-coach"}`}>
              {m.role === "coach" ? (
                <div className="flex-start gap-7 flex-shrink-0">
                  <Sparkles size={13} className="mt-3 text-optic" />
                  <span>{m.content}</span>
                </div>
              ) : m.content}
            </div>
          </div>
        ))}

        {loading ? (
          <div className="flex justify-start">
            <div className="coach-loading-bubble items-center gap-6">
              <Sparkles size={13} className="text-optic" />
              <span className="text-muted text-13">Thinking…</span>
            </div>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="coach-input-bar">
        <input
          className="inp flex-1"
          placeholder="Ask your coach…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          disabled={loading}
          maxLength={300}
        />
        <button className="btn btn-o py-0 px-14" onClick={() => send()} disabled={loading || !input.trim()}>
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
