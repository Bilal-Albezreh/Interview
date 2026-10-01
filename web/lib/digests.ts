import "server-only";
import { isDeepStrictEqual } from "node:util";
import { buildDigest } from "@core/digest";
import { findDuplicateQuestions, type DuplicateQuestion } from "@core/duplicates";
import { communityHealth, type CommunityHealth } from "@core/health";
import type { Digest, SlackMessage } from "@core/types";
import fullMessages from "@data/messages.json";
import sampleDigest from "@data/sample-digest.json";
import sampleMessages from "@data/sample-messages.json";
import { WEEK_START, type DatasetName } from "./datasets";
import { nudgeCounts } from "./nudges";

const MESSAGES: Record<DatasetName, SlackMessage[]> = {
  sample: sampleMessages as SlackMessage[],
  full: fullMessages as SlackMessage[],
};

export function messagesFor(dataset: DatasetName): SlackMessage[] {
  return MESSAGES[dataset];
}

export function digestFor(dataset: DatasetName): Digest {
  return buildDigest(MESSAGES[dataset], WEEK_START);
}

export type Preset = {
  digest: Digest;
  nudges: Record<string, number>;
  duplicates: DuplicateQuestion[];
  health: CommunityHealth;
};

/** A preset's digest plus what the page adds around it: nudges, duplicate questions and health metrics. */
export function presetFor(dataset: DatasetName): Preset {
  const digest = digestFor(dataset);
  return {
    digest,
    nudges: nudgeCounts(MESSAGES[dataset], WEEK_START, digest),
    duplicates: findDuplicateQuestions(MESSAGES[dataset], WEEK_START),
    health: communityHealth(MESSAGES[dataset], WEEK_START),
  };
}

export type SelfCheckResult = { pass: boolean; expected: Digest; actual: Digest };

// The same check as test/sample.test.ts: the sample must produce sample-digest.json exactly.
export function sampleSelfCheck(): SelfCheckResult {
  const expected = sampleDigest as Digest;
  const actual = digestFor("sample");
  return { pass: isDeepStrictEqual(actual, expected), expected, actual };
}
