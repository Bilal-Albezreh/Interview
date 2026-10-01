"use client";

import { useState } from "react";
import type { AnsweredBefore } from "@core/answered-before";
import { answeredBeforeLabel, friendlyReply } from "@/lib/reply";

/** Under a waiting question: the earlier answer, and a reply to copy. Copying never posts anything. */
export function AnsweredBeforeNote({ match }: { match: AnsweredBefore }) {
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const reply = friendlyReply(match);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(reply);
      setCopy("copied");
    } catch {
      setCopy("failed"); // clipboard blocked: show the reply to copy by hand
    }
  }

  return (
    <div className="answered-before">
      <p className="answered-before-label">{answeredBeforeLabel(match)}</p>
      <p className="answered-before-answer">&ldquo;{match.answer.text}&rdquo;</p>
      <div className="answered-before-actions">
        <button className="quiet small" onClick={onCopy}>
          Copy reply
        </button>
        <span className="status" role="status">
          {copy === "copied" && "Copied. Paste it in the thread when you're ready."}
          {copy === "failed" && "Couldn't reach the clipboard. Copy it from the box below."}
        </span>
      </div>
      {copy === "failed" && <textarea readOnly rows={3} value={reply} aria-label="Reply to copy" />}
    </div>
  );
}
