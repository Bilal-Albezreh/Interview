import type { SelfCheckResult } from "@/lib/digests";

export function SelfCheckPanel({ result }: { result: SelfCheckResult }) {
  return (
    <div className={`self-check ${result.pass ? "pass" : "fail"}`}>
      <p>
        <span className="verdict">{result.pass ? "Pass" : "Fail"}</span> Self-check: buildDigest on
        sample-messages.json {result.pass ? "matches" : "does not match"} sample-digest.json. Checked when this page
        was built.
      </p>
      <details>
        <summary>Show expected and actual</summary>
        <div className="compare">
          <div>
            <h4>Expected, from sample-digest.json</h4>
            <pre>{JSON.stringify(result.expected, null, 2)}</pre>
          </div>
          <div>
            <h4>Actual, from buildDigest</h4>
            <pre>{JSON.stringify(result.actual, null, 2)}</pre>
          </div>
        </div>
      </details>
    </div>
  );
}
