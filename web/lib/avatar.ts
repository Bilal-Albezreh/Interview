// Avatars stand in for raw Slack user IDs. Their colours come only from the existing tokens:
// the .tone-0 to .tone-4 classes in globals.css pair a background token with a text token.
export const AVATAR_TONES = 5;

/** Two letters from a Slack user ID: "U0P0KSYZ6HH" -> "PK". */
export function initials(userId: string): string {
  const letters = userId.slice(1).replace(/[^a-z]/gi, ""); // skip the "U" prefix and digits
  return (letters.length >= 2 ? letters : userId).slice(0, 2).toUpperCase();
}

/** A stable tone for an ID (FNV-1a hash), so the same person always gets the same colour. */
export function avatarTone(userId: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < userId.length; i++) {
    hash ^= userId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % AVATAR_TONES;
}
