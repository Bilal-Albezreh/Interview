import { avatarTone, initials } from "@/lib/avatar";

/** A small round avatar in place of a raw Slack user ID. The full ID is in the tooltip and the label. */
export function Person({ user, small = false }: { user: string; small?: boolean }) {
  return (
    <span
      className={`person tone-${avatarTone(user)}${small ? " small" : ""}`}
      role="img"
      aria-label={`Slack user ${user}`}
      title={user}
    >
      {initials(user)}
    </span>
  );
}
