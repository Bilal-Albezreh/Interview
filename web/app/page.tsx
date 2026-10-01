import { WEEK_START } from "@/lib/datasets";
import { digestFor, sampleSelfCheck } from "@/lib/digests";
import { formatWeek } from "@/lib/format";
import { PresetDigests } from "./preset-digests";
import { SelfCheckPanel } from "./self-check-panel";
import { TryYourOwn } from "./try-your-own";

// Runs on the server at build time: only the digests reach the browser, not the exports.
export default function Home() {
  const digests = { sample: digestFor("sample"), full: digestFor("full") };

  return (
    <main>
      <header>
        <h1>Weekly Slack digest</h1>
        <p className="lede">
          Top threads and unanswered questions for the week of {formatWeek(WEEK_START)}, built by{" "}
          <code>buildDigest</code>.
        </p>
      </header>

      <SelfCheckPanel result={sampleSelfCheck()} />

      <h2>Channel exports</h2>
      <PresetDigests digests={digests} />

      <h2>Try your own data</h2>
      <p className="lede">
        Paste or upload a messages JSON, pick the week, and build the digest. It runs in your browser; nothing is sent
        anywhere.
      </p>
      <TryYourOwn />
    </main>
  );
}
