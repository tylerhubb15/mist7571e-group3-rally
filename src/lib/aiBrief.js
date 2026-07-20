import { supabase } from "./services.js";

// The function requires a Supabase JWT (see ai-brief.js) — no session,
// no request. 20s client-side timeout, slightly longer than the
// function's own 15s OpenAI timeout, so a hung request fails with a
// clear message here rather than hanging the UI indefinitely.
const REQUEST_TIMEOUT_MS = 20000;

// Shared client for the /.netlify/functions/ai-brief serverless proxy —
// used by both Discover's per-match "AI Brief" and the AI Coach chat tab.
export async function fetchAiBrief(payload) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Sign in to use AI Brief.");

  let res;
  try {
    res = await fetch("/.netlify/functions/ai-brief", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      throw new Error("AI Brief is taking too long to respond. Try again in a moment.");
    }
    throw new Error("Couldn't reach the server. Check your connection and try again.");
  }

  let data;
  try {
    data = await res.json();
  } catch {
    // A timeout or platform-level failure (e.g. the function got killed
    // mid-request) can come back with an empty/non-JSON body — res.json()
    // throwing shouldn't surface as a raw browser exception to the user.
    throw new Error(`Server didn't return a valid response (${res.status}). Try again in a moment.`);
  }

  if (!res.ok || data.error) throw new Error(data.error || `Request failed (${res.status}).`);
  return data;
}
