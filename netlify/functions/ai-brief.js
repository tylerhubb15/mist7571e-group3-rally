// netlify/functions/ai-brief.js
// ─────────────────────────────────────────────────────────────────
//  Rally — AI Pre-Session Brief  (Role 2 — Tyler)
//  Serverless proxy so the OpenAI key never touches client code.
//
//  Endpoint: POST /.netlify/functions/ai-brief
//  Body: { player: { name, ntrp, format }, session: { day, period, court } }
//
//  Environment variable required:
//    OPENAI_API_KEY=sk-proj-...
// ─────────────────────────────────────────────────────────────────

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "OpenAI API key not configured." }),
    };
  }

  let player, session;
  try {
    ({ player, session } = JSON.parse(event.body || "{}"));
  } catch {
    return { statusCode: 400, body: "Invalid JSON body." };
  }

  if (!player || !session) {
    return { statusCode: 400, body: "Missing player or session data." };
  }

  const prompt = `You are a tennis coach giving a quick pre-match briefing.

Opponent: ${player.name}, NTRP ${player.ntrp}, prefers ${player.format || "Singles"}.
Session: ${session.day} ${session.period} at ${session.court}.

Give exactly 3 short bullet points (one sentence each) of specific, tactical match-prep advice for playing this opponent. Be direct and practical. No intro or outro text — just the 3 bullets starting with "•".`;

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
        max_tokens: 200,
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
      data.choices?.[0]?.message?.content?.trim() || "No brief generated.";

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
