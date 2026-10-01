"use client";

import { useState } from "react";
import type { Digest } from "@core/types";
import { buildBlockKit } from "@/lib/block-kit";
import { WEEK_START, type DatasetName } from "@/lib/datasets";
import { formatWeekOf } from "@/lib/format";

type Summary = { dataset: DatasetName } & (
  | { state: "loading" }
  | { state: "done"; text: string }
  | { state: "error"; message: string }
);

type Props = { dataset: DatasetName; digest: Digest; nudges: Record<string, number> };

export function SummarySection({ dataset, digest, nudges }: Props) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [copy, setCopy] = useState<{ state: "idle" | "copied" } | { state: "failed"; json: string }>({ state: "idle" });
  const shown = summary?.dataset === dataset ? summary : null; // a summary belongs to one dataset
  const loading = shown?.state === "loading";

  async function onWrite() {
    setCopy({ state: "idle" });
    setSummary({ dataset, state: "loading" });
    setSummary(await requestSummary(dataset));
  }

  async function onCopy() {
    const text = shown?.state === "done" ? shown.text : undefined;
    const json = JSON.stringify(buildBlockKit(digest, nudges, WEEK_START, text), null, 2);
    try {
      await navigator.clipboard.writeText(json);
      setCopy({ state: "copied" });
    } catch {
      setCopy({ state: "failed", json }); // e.g. clipboard blocked: show it to copy by hand
    }
  }

  return (
    <section className="section" aria-labelledby="summary-heading">
      <h2 id="summary-heading">Summary</h2>
      <p className="note">How this digest would arrive in Slack. The AI writes it from the two lists above, nothing else.</p>

      <div className="slack-message" aria-live="polite" aria-busy={loading}>
        <div className="avatar" aria-hidden="true">
          WD
        </div>
        <div className="message">
          <p className="message-head">
            <span className="bot-name">Weekly digest</span>
            <span className="app-tag">App</span>
            <span className="time">9:00 AM</span>
          </p>
          <p className="message-title">Monday digest · {formatWeekOf(WEEK_START)}</p>
          {!shown && <p className="message-body placeholder">No summary yet. Write one with AI, or copy the lists as Block Kit.</p>}
          {loading && <p className="message-body placeholder">Writing the summary…</p>}
          {shown?.state === "done" && <p className="message-body">{shown.text}</p>}
          {shown?.state === "error" && (
            <p className="message-body error" role="alert">
              <strong>Couldn&rsquo;t write the summary.</strong> {shown.message}
            </p>
          )}
        </div>
      </div>

      <div className="actions">
        <button className="primary" onClick={onWrite} disabled={loading}>
          {loading ? "Writing…" : shown?.state === "done" ? "Write it again" : "Write summary with AI"}
        </button>
        <button onClick={onCopy}>Copy as Block Kit JSON</button>
        <span className="status" role="status">
          {copy.state === "copied" && "Copied. Paste it into Slack's Block Kit Builder to preview."}
          {copy.state === "failed" && "Couldn't reach the clipboard. Copy the JSON below instead."}
        </span>
      </div>
      {copy.state === "failed" && (
        <textarea className="json-fallback" readOnly rows={8} value={copy.json} aria-label="Block Kit JSON" />
      )}
    </section>
  );
}

async function requestSummary(dataset: DatasetName): Promise<Summary> {
  try {
    const res = await fetch("/api/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataset }),
    });
    const body = await res.json().catch(() => null);
    if (res.ok && typeof body?.summary === "string") return { dataset, state: "done", text: body.summary };
    const message = typeof body?.error === "string" ? body.error : `The server answered with status ${res.status}.`;
    return { dataset, state: "error", message };
  } catch {
    return { dataset, state: "error", message: "Couldn't reach the server. Check your connection and try again." };
  }
}
