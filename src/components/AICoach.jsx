import React, { useState } from "react";
import { Sparkles } from "lucide-react";
import { Header } from "./Shared.jsx";

const NTRP_LEVELS = ["2.0", "2.5", "3.0", "3.5", "4.0", "4.5", "5.0", "5.5"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PERIODS = ["AM", "PM", "EVE"];
const FORMATS = ["Singles", "Doubles"];

export default function AICoach({ me }) {
  const [form, setForm] = useState({
    opponentName: "",
    opponentNtrp: "3.5",
    format: "Singles",
    day: "Sat",
    period: "AM",
    court: "",
  });
  const [state, setState] = useState("idle"); // idle | loading | done | error
  const [brief, setBrief] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setState("loading");
    setBrief("");
    setErrorMsg("");
    try {
      const res = await fetch("/.netlify/functions/ai-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player: {
            name: form.opponentName || "your opponent",
            ntrp: form.opponentNtrp,
            format: form.format,
          },
          session: {
            day: form.day,
            period: form.period,
            court: form.court || "your court",
          },
          me: me ? { ntrp: me.ntrp } : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error)
        throw new Error(data.error || "Request failed");
      setBrief(data.brief);
      setState("done");
    } catch (err) {
      setErrorMsg(err.message || "Something went wrong. Try again.");
      setState("error");
    }
  }

  return (
    <div>
      <Header
        eyebrow="AI Coach"
        title="Pre-match brief"
        sub="Enter your opponent's details and get AI-powered tactical advice before you play."
      />

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
        <div className="card" style={{ padding: 16, display: "grid", gap: 14 }}>
          <div>
            <label
              className="disp"
              style={{
                fontSize: 12,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: ".04em",
                display: "block",
                marginBottom: 6,
              }}
            >
              Opponent name{" "}
              <span style={{ color: "var(--muted)", fontWeight: 600 }}>
                (optional)
              </span>
            </label>
            <input
              className="input"
              type="text"
              placeholder="e.g. Marcus"
              value={form.opponentName}
              onChange={(e) => set("opponentName", e.target.value)}
              maxLength={40}
              style={{ width: "100%" }}
            />
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div>
              <label
                className="disp"
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: ".04em",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Opponent NTRP
              </label>
              <select
                className="input"
                value={form.opponentNtrp}
                onChange={(e) => set("opponentNtrp", e.target.value)}
                style={{ width: "100%" }}
              >
                {NTRP_LEVELS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="disp"
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: ".04em",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Format
              </label>
              <select
                className="input"
                value={form.format}
                onChange={(e) => set("format", e.target.value)}
                style={{ width: "100%" }}
              >
                {FORMATS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div>
              <label
                className="disp"
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: ".04em",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Day
              </label>
              <select
                className="input"
                value={form.day}
                onChange={(e) => set("day", e.target.value)}
                style={{ width: "100%" }}
              >
                {DAYS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="disp"
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: ".04em",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Time
              </label>
              <select
                className="input"
                value={form.period}
                onChange={(e) => set("period", e.target.value)}
                style={{ width: "100%" }}
              >
                {PERIODS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              className="disp"
              style={{
                fontSize: 12,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: ".04em",
                display: "block",
                marginBottom: 6,
              }}
            >
              Court{" "}
              <span style={{ color: "var(--muted)", fontWeight: 600 }}>
                (optional)
              </span>
            </label>
            <input
              className="input"
              type="text"
              placeholder="e.g. Bishop Park"
              value={form.court}
              onChange={(e) => set("court", e.target.value)}
              maxLength={60}
              style={{ width: "100%" }}
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-o"
          disabled={state === "loading"}
          style={{
            justifyContent: "center",
            padding: "13px 0",
            fontSize: 15,
            fontWeight: 800,
          }}
        >
          <Sparkles size={16} />
          {state === "loading" ? "Generating brief…" : "Get AI Brief"}
        </button>
      </form>

      {state === "done" && brief ? (
        <div
          className="card"
          style={{
            marginTop: 18,
            padding: 18,
            border: "2px solid var(--optic)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: ".04em",
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Sparkles size={13} /> AI Match Prep
            {form.opponentName ? (
              <span style={{ color: "var(--muted)", fontWeight: 600 }}>
                · {form.opponentName}
              </span>
            ) : null}
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--ink2)",
              whiteSpace: "pre-line",
              lineHeight: 1.75,
            }}
          >
            {brief}
          </div>
          <button
            className="btn btn-ghost"
            style={{ marginTop: 12, fontSize: 12 }}
            onClick={() => setState("idle")}
          >
            New brief
          </button>
        </div>
      ) : null}

      {state === "error" ? (
        <div
          className="card"
          style={{
            marginTop: 18,
            padding: 14,
            border: "1.5px solid var(--clay)",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--clay)" }}>
            {errorMsg}
          </div>
          <button
            className="btn btn-ghost"
            style={{ marginTop: 8, fontSize: 12 }}
            onClick={() => setState("idle")}
          >
            Try again
          </button>
        </div>
      ) : null}
    </div>
  );
}
