"use client";

import { useState } from "react";
import type { Digest } from "@core/types";
import { DATASET_LABELS, DATASET_NAMES, type DatasetName } from "@/lib/datasets";
import { DigestLists } from "./digest-lists";

type Summary = { dataset: DatasetName } & (
  | { state: "loading" }
  | { state: "done"; text: string }
  | { state: "error"; message: string }
);

export function PresetDigests({ digests }: { digests: Record<DatasetName, Digest> }) {
  const [dataset, setDataset] = useState<DatasetName>("full");
  const [summary, setSummary] = useState<Summary | null>(null);
  const shown = summary?.dataset === dataset ? summary : null; // a summary belongs to one tab

  async function onWriteSummary() {
    setSummary({ dataset, state: "loading" });
    setSummary(await requestSummary(dataset));
  }

  return (
    <div className="card">
      <div className="tabs" role="tablist" aria-label="Dataset">
        {DATASET_NAMES.map((name) => (
          <button
            key={name}
            role="tab"
            aria-selected={dataset === name}
            className={dataset === name ? "tab active" : "tab"}
            onClick={() => setDataset(name)}
          >
            {DATASET_LABELS[name]}
          </button>
        ))}
      </div>

      <DigestLists digest={digests[dataset]} />

      <div className="ai">
        <button className="primary" onClick={onWriteSummary} disabled={shown?.state === "loading"}>
          {shown?.state === "loading" ? "Writing summary…" : "Write summary with AI"}
        </button>
        <p className="hint">Sends only this digest&rsquo;s text and counts to OpenAI, never raw messages or user IDs.</p>
        {shown?.state === "done" && <p className="summary">{shown.text}</p>}
        {shown?.state === "error" && (
          <p className="error" role="alert">
            {shown.message}
          </p>
        )}
      </div>
    </div>
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
