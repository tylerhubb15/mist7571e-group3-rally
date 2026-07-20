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
//  Requires an `Authorization: Bearer <supabase access token>` header —
//  without a Supabase JWT check here, this endpoint was a fully open,
//  unauthenticated proxy to OpenAI: anyone who found the URL (trivial —
//  it's a relative path in the client bundle) could hit it directly and
//  burn through the OpenAI budget with no relationship to Rally at all.
//  Authenticated callers are further capped by check_ai_brief_rate_limit()
//  in Postgres so one signed-in account can't do the same thing slower.
//
//  Environment variables required:
//    OPENAI_API_KEY=sk-proj-...
//    SUPABASE_URL / VITE_SUPABASE_URL          (either name — Netlify
//    SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY  injects both into functions)
// ─────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

const JSON_HEADERS = { "Content-Type": "application/json" };
const jsonError = (statusCode, message) => ({
  statusCode,
  headers: JSON_HEADERS,
  body: JSON.stringify({ error: message }),
});

// A hung upstream (OpenAI or Supabase auth) shouldn't hang this function
// indefinitely — fail fast and let the client retry instead.
const OPENAI_TIMEOUT_MS = 15000;

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonError(405, "Method Not Allowed");
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonError(500, "OpenAI API key not configured.");
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonError(500, "Supabase isn't configured for this function.");
  }

  const authHeader = event.headers?.authorization || event.headers?.Authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return jsonError(401, "Sign in to use AI Brief.");
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return jsonError(401, "Your session has expired — sign in again.");
  }

  const { data: allowed, error: rateLimitError } = await supabase.rpc(
    "check_ai_brief_rate_limit",
    { p_user_id: user.id }
  );
  if (rateLimitError) {
    return jsonError(500, "Couldn't check usage limits — try again in a moment.");
  }
  if (!allowed) {
    return jsonError(429, "You've hit the AI Brief limit for this hour — try again later.");
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
      signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
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
