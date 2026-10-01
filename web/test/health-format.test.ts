import { describe, expect, it } from "vitest";
import { formatHours, formatRate, formatRateChange, formatTimeChange } from "@/lib/health-format";

describe("health row wording", () => {
  it.each([
    [0.5555, "56%"],
    [1, "100%"],
    [null, "No questions"],
  ])("formatRate(%s) -> %s", (rate, text) => expect(formatRate(rate)).toBe(text));

  it.each([
    [40 / 60, "40 min"],
    [9.866, "9.9 hours"],
    [null, "No answers yet"],
  ])("formatHours(%s) -> %s", (hours, text) => expect(formatHours(hours)).toBe(text));

  it.each([
    [-0.147, "down 15 points from last week"],
    [0.01, "up 1 point from last week"],
    [0.001, "same as last week"],
    [null, "nothing to compare with last week"],
  ])("formatRateChange(%s) -> %s", (change, text) => expect(formatRateChange(change)).toBe(text));

  it.each([
    [-2.023, "2.0 hours faster than last week"],
    [0.5, "30 min slower than last week"],
    [0.001, "same as last week"],
    [null, "nothing to compare with last week"],
  ])("formatTimeChange(%s) -> %s", (change, text) => expect(formatTimeChange(change)).toBe(text));
});
