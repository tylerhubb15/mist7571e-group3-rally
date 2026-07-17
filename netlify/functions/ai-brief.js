// netlify/functions/ai-brief.js
// ─────────────────────────────────────────────────────────────────
//  Rally — AI Coach  (Role 2 — Tyler)
//  Serverless proxy so the OpenAI key never touches client code.
//
//  Two modes:
//    mode: "matchup" — pre-match brief for a specific opponent (Discover tab)
//      Body: { mode: "matchup", player: { name, ntrp, hand, racket, record }, court }
//      `record` is the viewer's head-to-head "W-L" string against this
//      player (e.g. "2-1"), or null/omitted if they've never played.
//
//    mode: "chat" — general tennis coaching chat (AI Coach tab)
//      Body: { mode: "chat", message: "...", history: [{role, content}, ...] }
//
//  Environment variable required:
//    OPENAI_API_KEY=sk-proj-...
// ─────────────────────────────────────────────────────────────────

const JSON_HEADERS = { "Content-Type": "application/json" };
const jsonError = (statusCode, message) => ({
  statusCode,
  headers: JSON_HEADERS,
  body: JSON.stringify({ error: message }),
});

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonError(405, "Method Not Allowed");
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonError(500, "OpenAI API key not configured.");
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonError(400, "Invalid JSON body.");
  }

  const { mode = "matchup", player, court, message, history } = body;

  let prompt;

  if (mode === "chat") {
    if (!message) {
      return jsonError(400, "Missing message for chat mode.");
    }
    const historyText = (history || [])
      .slice(-6)
      .map((m) => `${m.role === "user" ? "Player" : "Coach"}: ${m.content}`)
      .join("\n");
    prompt = `You are an expert tennis coach helping a recreational player improve their game. Be concise, practical, and encouraging. Answer in 2-4 sentences of plain text — no markdown, no headers.${historyText ? `\n\nConversation so far:\n${historyText}` : ""}

Player: ${message}
Coach:`;
  } else {
    if (!player) {
      return jsonError(400, "Missing player data.");
    }
    const details = [
      `NTRP ${player.ntrp}.`,
      player.hand ? `Hits ${player.hand}-handed.` : null,
      player.racket ? `Plays with a ${player.racket}.` : null,
      player.record ? `Your head-to-head record against them is ${player.record} (wins-losses).` : "You haven't played them before.",
      court ? `Likely court: ${court}.` : null,
    ].filter(Boolean).join("\n");

    prompt = `You are a tennis coach giving a quick pre-match briefing.

Opponent: ${player.name}
${details}

Give exactly 3 short bullet points (one sentence each) of specific, tactical match-prep advice for playing THIS opponent. Ground each point in the specific details above — their skill level, playing hand, equipment, or your history against them — rather than generic tennis tips that could apply to anyone. Be direct and practical. No intro or outro — just 3 bullets starting with "•".`;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: mode === "chat" ? 300 : 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: `OpenAI error: ${response.status}`,
          detail: err,
        }),
      };
    }

    const data = await response.json();
    const brief =
      data.choices?.[0]?.message?.content?.trim() || "No response generated.";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brief }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Failed to reach OpenAI.",
        detail: err.message,
      }),
    };
  }
};
