import { presetFor, sampleSelfCheck } from "@/lib/digests";
import { MondayDigest } from "./monday-digest";
import { SelfCheckPanel } from "./self-check-panel";
import { TryYourOwn } from "./try-your-own";

const REPO_URL = "https://github.com/Bilal-Albezreh/Interview";

// Runs on the server at build time: only the digests reach the browser, not the exports.
export default function Home() {
  const presets = { sample: presetFor("sample"), full: presetFor("full") };

  return (
    <>
      <MondayDigest
        presets={presets}
        tools={
          <>
            <p className="note">
              Paste or upload a messages export, pick the week, and build its digest. It runs in your browser; nothing
              is sent anywhere.
            </p>
            <TryYourOwn />
            <SelfCheckPanel result={sampleSelfCheck()} />
          </>
        }
      />
      <footer className="container footer">
        Built by Bilal for the Tightknit co-op exercise. <a href={REPO_URL}>Source on GitHub</a>
      </footer>
    </>
  );
}
