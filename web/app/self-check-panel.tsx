import type { SelfCheckResult } from "@/lib/digests";

export function SelfCheckPanel({ result }: { result: SelfCheckResult }) {
  return (
    <section className={`card self-check ${result.pass ? "pass" : "fail"}`} aria-label="Self-check">
      <div className="self-check-row">
        <span className="badge">{result.pass ? "PASS" : "FAIL"}</span>
        <p>
          <code>buildDigest(sample-messages.json)</code> {result.pass ? "matches" : "does not match"}{" "}
          <code>sample-digest.json</code>. Checked when this page was built.
        </p>
      </div>
      <details>
        <summary>Show expected and actual</summary>
        <div className="compare">
          <div>
            <h4>Expected (sample-digest.json)</h4>
            <pre>{JSON.stringify(result.expected, null, 2)}</pre>
          </div>
          <div>
            <h4>Actual (buildDigest)</h4>
            <pre>{JSON.stringify(result.actual, null, 2)}</pre>
          </div>
        </div>
      </details>
    </section>
  );
}
