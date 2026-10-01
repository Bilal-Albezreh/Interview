"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { buildDigest } from "@core/digest";
import { findDuplicateQuestions, type DuplicateQuestion } from "@core/duplicates";
import { communityHealth, type CommunityHealth } from "@core/health";
import type { Digest } from "@core/types";
import { WEEK_START_ISO } from "@/lib/datasets";
import { formatWeek } from "@/lib/format";
import { nudgeCounts } from "@/lib/nudges";
import { formatSize, MAX_INPUT_BYTES, parseMessages } from "@/lib/parse-messages";
import { DuplicateGroups } from "./duplicate-groups";
import { HealthRow } from "./health-row";
import { TopThreads } from "./top-threads";
import { WaitingList } from "./waiting-list";

// Loaded on click, so the 551-message export isn't in the page's main bundle.
const PRESETS: { label: string; load: () => Promise<unknown[]> }[] = [
  { label: "Sample", load: () => import("@data/sample-messages.json").then((m) => m.default) },
  { label: "Full export", load: () => import("@data/messages.json").then((m) => m.default) },
  { label: "Empty channel", load: async () => [] },
];

type Result =
  | {
      digest: Digest;
      nudges: Record<string, number>;
      duplicates: DuplicateQuestion[];
      health: CommunityHealth;
      messageCount: number;
      weekStart: Date;
    }
  | { errors: string[] };

export function TryYourOwn() {
  const [input, setInput] = useState("");
  const [weekStart, setWeekStart] = useState(WEEK_START_ISO);
  const [result, setResult] = useState<Result | null>(null);
  const bytes = useMemo(() => new TextEncoder().encode(input).length, [input]);

  // Everything here runs in the browser: custom data never reaches the server or OpenAI.
  function run(text = input, week = weekStart) {
    const start = new Date(`${week}T00:00:00Z`);
    if (Number.isNaN(start.getTime())) return setResult({ errors: ["Pick a week start date."] });
    const parsed = parseMessages(text);
    if (!parsed.ok) return setResult({ errors: parsed.errors });
    const digest = buildDigest(parsed.messages, start);
    setResult({
      digest,
      nudges: nudgeCounts(parsed.messages, start, digest),
      duplicates: findDuplicateQuestions(parsed.messages, start),
      health: communityHealth(parsed.messages, start),
      messageCount: parsed.messages.length,
      weekStart: start,
    });
  }

  async function loadPreset(load: () => Promise<unknown[]>) {
    const text = JSON.stringify(await load(), null, 2);
    setInput(text);
    setWeekStart(WEEK_START_ISO);
    run(text, WEEK_START_ISO);
  }

  async function onUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // so picking the same file again still fires
    if (!file) return;
    if (file.size > MAX_INPUT_BYTES) {
      return setResult({ errors: [`${file.name} is ${formatSize(file.size)}. The limit is 2 MB.`] });
    }
    const text = await file.text();
    setInput(text);
    run(text);
  }

  return (
    <div className="try">
      <div className="toolbar">
        <span className="label">Start from</span>
        {PRESETS.map((p) => (
          <button key={p.label} className="quiet" onClick={() => loadPreset(p.load)}>
            {p.label}
          </button>
        ))}
        <label className="upload quiet">
          Upload JSON
          <input type="file" accept=".json,application/json" onChange={onUpload} />
        </label>
      </div>

      <label className="field">
        <span className="field-label">Messages JSON</span>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='[{ "ts": "1790271900.007090", "user": "U0G6RB9TXL", "text": "Is there an API endpoint for creating events?" }]'
          spellCheck={false}
          rows={8}
        />
        <span className={bytes > MAX_INPUT_BYTES ? "size over" : "size"}>{formatSize(bytes)} of 2 MB</span>
      </label>

      <div className="toolbar">
        <label className="field inline">
          <span className="field-label">Week starts</span>
          <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
        </label>
        <button onClick={() => run()}>Build digest</button>
      </div>

      {result && "errors" in result && (
        <div className="error-box" role="alert">
          <p>
            <strong>Couldn&rsquo;t build a digest.</strong>
          </p>
          <ul>
            {result.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      {result && "digest" in result && (
        <div className="try-result">
          <p className="result-head">
            {result.messageCount} messages, week of {formatWeek(result.weekStart)}. AI summaries are only for the two
            exports above.
          </p>
          <HealthRow health={result.health} />
          <h3>Top threads</h3>
          <TopThreads threads={result.digest.topThreads} />
          <h3>Waiting for an answer</h3>
          <WaitingList questions={result.digest.unanswered} nudges={result.nudges} />
          <DuplicateGroups groups={result.duplicates} unanswered={result.digest.unanswered} />
        </div>
      )}
    </div>
  );
}
