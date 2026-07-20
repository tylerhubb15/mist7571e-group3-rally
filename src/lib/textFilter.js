// Strips emoji and other symbol characters from user-typed text, while
// keeping any language's letters (é, ñ, ü, …), numbers, and normal
// punctuation. Applied as text is typed so disallowed characters never
// make it into the field.
const ALLOWED_CHAR = /[\p{L}\p{M}\p{N}\p{Zs}\n.,'"’!?()&:;/-]/gu;

export function sanitizeText(value = "") {
  return value.match(ALLOWED_CHAR)?.join("") ?? "";
}

// Stricter filter for name fields — letters (any language, incl. accents)
// and spaces only. No digits, punctuation, or symbols.
const ALLOWED_NAME_CHAR = /[\p{L}\p{M} ]/gu;

export function sanitizeName(value = "") {
  return value.match(ALLOWED_NAME_CHAR)?.join("") ?? "";
}

// Mirrors contains_denied_word() in supabase/schema.sql — same normalize
// (lowercase, leetspeak-collapse, strip non-letters) + substring denylist.
// This client-side copy only exists to give instant feedback before a
// round trip; the DB trigger is the actual enforcement boundary (it still
// catches direct API calls this never sees), so keep the two lists in sync
// rather than trusting this one alone.
const LEETSPEAK = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", $: "s", "@": "a", "!": "i" };
const DENIED_WORDS = [
  "fuck", "shit", "bitch", "asshole", "bastard", "cunt", "pussy",
  "nigger", "nigga", "fag", "retard", "whore", "slut",
];

export function containsProfanity(value) {
  if (!value) return false;
  const normalized = value
    .toLowerCase()
    .replace(/[01345$@!]/g, (ch) => LEETSPEAK[ch])
    .replace(/[^a-z]/g, "");
  return DENIED_WORDS.some((word) => normalized.includes(word));
}
