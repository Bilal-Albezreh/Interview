"use client";

import { useState } from "react";
import type { Digest } from "@core/types";
import { DATASET_NAMES, WEEK_START, type DatasetName } from "@/lib/datasets";
import { formatWeekOf } from "@/lib/format";
import { SummarySection } from "./summary-section";
import { TopThreads } from "./top-threads";
import { WaitingList } from "./waiting-list";

type Preset = { digest: Digest; nudges: Record<string, number> };

const LABELS: Record<DatasetName, string> = { sample: "Sample", full: "Full export" };

export function MondayDigest({ presets }: { presets: Record<DatasetName, Preset> }) {
  const [dataset, setDataset] = useState<DatasetName>("full");
  const [firstLoad, setFirstLoad] = useState(true); // stitches draw in once, not on every switch
  const { digest, nudges } = presets[dataset];

  function choose(name: DatasetName) {
    setFirstLoad(false);
    setDataset(name);
  }

  return (
    <article className="letter" aria-labelledby="digest-title">
      <header className="letter-head">
        <div>
          <h1 id="digest-title">Monday digest</h1>
          <p className="week">{formatWeekOf(WEEK_START)}</p>
        </div>
        <div className="switch" role="group" aria-label="Channel export">
          {DATASET_NAMES.map((name) => (
            <button key={name} aria-pressed={dataset === name} onClick={() => choose(name)}>
              {LABELS[name]}
            </button>
          ))}
        </div>
      </header>

      <p className="intro">{intro(digest)}</p>

      <section className="section" aria-labelledby="threads-heading">
        <h2 id="threads-heading">Top threads</h2>
        <p className="note">The conversations with the most replies posted this week.</p>
        <TopThreads threads={digest.topThreads} animate={firstLoad} />
      </section>

      <section className="section" aria-labelledby="waiting-heading">
        <h2 id="waiting-heading">Waiting for an answer</h2>
        <p className="note">
          Most nudged first. A nudge is a &ldquo;+1, same question&rdquo; reply, or the asker bumping their own post.
        </p>
        <WaitingList questions={digest.unanswered} nudges={nudges} />
      </section>

      <SummarySection dataset={dataset} digest={digest} nudges={nudges} />
    </article>
  );
}

function intro({ topThreads, unanswered }: Digest): string {
  const n = unanswered.length;
  const opening = topThreads.length > 0 ? "Here's where the conversation was this week" : "A quiet week: no thread got replies";
  const waiting =
    n === 0
      ? ", and every question got an answer."
      : `, and the ${n === 1 ? "one question" : `${n} questions`} still waiting for an answer.`;
  return `Good morning. ${opening}${waiting}`;
}
