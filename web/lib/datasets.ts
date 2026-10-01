// Shared by the server and the browser, so nothing secret or large goes here.

export const WEEK_START_ISO = "2026-09-21"; // a Monday
export const WEEK_START = new Date(`${WEEK_START_ISO}T00:00:00Z`);

export const DATASET_NAMES = ["sample", "full"] as const;
export type DatasetName = (typeof DATASET_NAMES)[number];

export const DATASET_LABELS: Record<DatasetName, string> = {
  sample: "Sample (11 messages)",
  full: "Full export (551 messages)",
};
