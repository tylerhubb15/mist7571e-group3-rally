// netlify/functions/ai-brief.js
// ─────────────────────────────────────────────────────────────────
//  Rally — AI Pre-Session Brief  (Role 2 — Tyler)
//  Serverless proxy so the OpenAI key never touches client code.
//
//  Endpoint (once deployed):
//    POST /.netlify/functions/ai-brief
//    Body: { me: {...}, player: {...} }
//
//  Environment variable required (set in Netlify UI → Site → Environment):
//    OPENAI_API_KEY=sk-proj-...
// ─────────────────────────────────────────────────────────────────

export const handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // TODO (Role 2): implement OpenAI call here
  // Stub returns a placeholder so the app can be wired up end-to-end
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      brief: "AI brief coming soon — Role 2 in progress.",
    }),
  };
};
