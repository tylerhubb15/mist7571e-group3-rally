// Shared client for the /.netlify/functions/ai-brief serverless proxy —
// used by both Discover's per-match "AI Brief" and the AI Coach chat tab.
export async function fetchAiBrief(payload) {
  const res = await fetch("/.netlify/functions/ai-brief", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

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
