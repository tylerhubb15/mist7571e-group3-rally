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
