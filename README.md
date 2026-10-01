# Tightknit Co-op Interview Exercise

[![CI](https://github.com/Bilal-Albezreh/Interview/actions/workflows/ci.yml/badge.svg)](https://github.com/Bilal-Albezreh/Interview/actions/workflows/ci.yml)

**The exercise instructions are in [this Google Doc](https://docs.google.com/document/d/13_4C8eQFjhEEvfY8hTlp4ikYebg9yp0Dypb3UpRSj4o/edit?tab=t.0).** Read them first. This README covers setup, how `buildDigest` works, and the demo app in `web/`.

## Setup

Requires Node 20 or later.

```sh
npm install
```

## Running and testing

```sh
npm test          # runs the tests in test/
npm run typecheck
npm run digest    # runs buildDigest on data/messages.json and prints the result
npm run digest -- data/sample-messages.json
```

## What's here

| Path | What it is |
| --- | --- |
| `src/digest.ts` | `buildDigest` |
| `src/classify.ts` | Word-list rules: is it a question, a real answer, a me-too or bump |
| `src/types.ts` | `SlackMessage` and `Digest` types |
| `src/run.ts` | Script behind `npm run digest` |
| `data/sample-messages.json` | 11 messages, so you can get a feel for the data |
| `data/sample-digest.json` | The digest those 11 messages should produce |
| `data/messages.json` | The full channel export (551 messages) |
| `test/sample.test.ts` | The two starter tests |
| `test/digest.test.ts` | One test per rule and edge case, on small hand-built messages |
| `test/classify.test.ts` | The word-list rules, mostly with real messages from the export |
| `test/full-export.test.ts` | Spot checks on `data/messages.json`, expected values worked out by reading the data |
| `vitest.config.ts` | Keeps `npm test` to `test/`; the demo app has its own tests |
| `web/` | Demo app (Next.js), see [Demo app](#demo-app) |
| `.github/workflows/ci.yml` | CI on every push: tests and typecheck here, plus test, typecheck and build for `web/` |

## How `buildDigest` works

### Definitions

**The week** runs from `weekStart` up to, but not including, `weekStart + 7 days`. A message at exactly Monday 00:00 belongs to the week that starts then. The export has one message on each edge.

**Active thread.** A thread's activity is the number of replies posted during the week.
- The asker's own replies count. The sample requires this: its HubSpot thread has 3, including the asker's "thanks both!".
- Bot replies and the opening post don't count.
- Threads started before the week count if they got replies this week.
- The top 3 are returned, most replies first, or fewer if fewer threads had replies.

**Question.** A top-level post from a person, posted this week, that either:
- contains a `?` and isn't rhetorical ("Isn't it…", "Can you believe…", "How cool is…", "Who else is…", or anything with `?!`), or
- asks without a `?`: it starts with "Anyone", "Does anyone", "Is there", "How do I"…, or contains "looking for", "wondering if", "curious how", "would love to hear", "any tips", "recommendations for" or "need help".

Links and @mentions are removed first, so a `?` inside a URL doesn't count. In this export, 45 of the week's 74 posts from people are questions, and 10 of those have no `?`.

**Answered.** At least one reply before the week ends, from someone other than the asker, that is a real answer. These don't count:
- bot replies (bots are ignored everywhere),
- me-toos and bumps: "+1…", "same here", "same question", "following", "bump", "anyone?", "any ideas?",
- reactions: "thanks", "love this", "saving this", "congrats", or emoji only.

### Decisions and why

| Decision | Why |
| --- | --- |
| Answers posted after the week ends don't count. | The digest describes the channel as of Monday 00:00, the same cut-off `repliesThisWeek` uses. A question first answered on Monday morning was still unanswered when the week closed. This also means the result doesn't depend on when the export was pulled. |
| Questions the asker solved themselves stay listed. | Nobody else answered, and the admin may still want to see it, for example to add the fix to the docs. Only replies from someone other than the asker count as answers. |
| Only top-level posts are checked for questions. | Slack threads are flat, so there's no way to tell which reply answers which question inside a thread. The questions in the AMA thread ("Will this be recorded?") are meant for the live session anyway. |
| Reposted questions are listed separately. | Each post is its own unanswered message. Merging repeats like "Who owns community…" (asked 3 times) is the duplicate-questions stretch goal. |
| Ties for the top 3 threads go to the older thread. | The result stays the same whatever order the input is in (the export is newest first). |
| Unanswered questions are ordered by demand, then oldest first. | Demand is the number of me-too replies and asker bumps before the week ends ("+1, same question", "bump", "anyone? still stuck on this"). These are people saying the question matters. Reactions on the question (👀, 👍) would be a better signal, but `SlackMessage` has no reactions field. Add them to the count once the data includes them. |
| `reply_count` isn't used. | It's the all-time total, and it includes bot replies and replies after the week, which the sample's expected output excludes. The AMA thread has a `reply_count` of 18 but only 2 replies this week. Snapshotting `reply_count` at each week boundary and subtracting would work, but that needs one export per week, and there's only one here. It's very useful for fetching, though (see below). |

### Known limits of the word lists

The rules are English-only and were tuned on this one export. Each example below was run through the code:

- **Missed questions:** asks with no `?` and phrasing not in the list, e.g. "Trying to figure out how to export members", "Need a template for onboarding", "We tried X. Thoughts".
- **False questions:** any `?` not on the rhetorical list counts, e.g. "Got questions? Bring them to office hours" or "What a week?".
- **Reactions not in the list count as answers**, which hides the question: "wow", "interesting", "ty".
- **Relevance isn't checked.** Any reply with real content counts as an answer, even if it's off topic. The export has these: "Luma has worked well for us." is the reply to a code-of-conduct question.
- **A reply that starts like a bump is treated as one** even if it has content after: "Anyone know? we use Zapier".
- **Other languages** only work through the `?`: "¿Alguien usa Circle?" is caught, "Alguien usa Circle" isn't.

Next step: keep the cheap rules for the clear cases and send borderline messages to an LLM classifier (the "generate with AI" stretch goal). The rules all live in `src/classify.ts` with a test for each example, so extending them is one line plus a test.

## Demo app

`web/` is a small Next.js app that shows the digest. It's kept separate from the exercise: it imports `buildDigest` from `src/` and the exports from `data/`, and changes neither.

The page is the Monday digest an admin would receive, laid out as a calm letter:

- **Header:** "Monday digest", the week, and a switch between the sample and the full export. `buildDigest` runs on the server when the site is built, so only the digests reach the browser.
- **Top threads:** each with its replies this week and a teal running stitch whose length matches. The stitches draw in once on first load (not with reduced motion).
- **Waiting for an answer:** the unanswered questions, most nudged first, with their nudge count ("+1, same question" replies and bumps). The first 8 show; the rest are one click away. `buildDigest` sorts by this count but doesn't return it, so `web/lib/nudges.ts` recounts it with the same rule, and a test checks the two agree.
- **Summary:** the AI summary shown as a Slack-style message, plus "Copy as Block Kit JSON" (header, section and divider blocks, within Slack's size limits, with `&`, `<` and `>` escaped so message text can't ping the channel).
- **Test it yourself:** paste or upload a messages JSON (up to 2 MB), pick the week start, and build the digest. It's validated with zod and runs entirely in the browser, with presets for the sample, the full export and an empty channel, and no AI summary. Below it, the self-check shows Pass or Fail for the sample against `sample-digest.json`.

### Run it locally

```sh
cd web
npm install
cp .env.example .env.local   # then add your OPENAI_API_KEY
npm run dev                  # http://localhost:3000
npm test                     # web tests
```

The page works without a key; only the AI button needs one, and without it the button explains what's missing.

### Deploy to Vercel

1. Import the repo in Vercel and set **Root Directory** to `web`. Keep "Include files outside the root directory in the Build Step" on (the default), since the app imports `../src` and `../data`. `web/vercel.json` sets the framework to Next.js, so the Framework Preset in the dashboard doesn't matter (if it's "Other", the build fails with "No Output Directory named "public" found").
2. Add the environment variable `OPENAI_API_KEY`. `OPENAI_MODEL` is optional and defaults to `gpt-5.4-mini`.
3. Deploy.

### How the AI route stays safe

- **The key stays on the server.** It's read from `OPENAI_API_KEY` in a module marked `server-only`, so the build fails if anything imports it into browser code.
- **The route takes a dataset name, never text.** It accepts only `{"dataset": "sample"}` or `{"dataset": "full"}` and rebuilds the digest itself, so nobody can send their own prompt through the key.
- **OpenAI gets only the digest's text and counts.** Raw messages are never sent, and Slack user IDs and timestamps are dropped. The prompt tells the model to treat the texts as quoted data, not instructions. The reply is shown as plain text, never HTML.
- **Rate limit:** 5 requests per minute per IP. The counts are kept in server memory, so on Vercel each instance counts separately and a cold start resets them. That's fine for a demo; production would use shared storage (Vercel KV, Upstash) or a Vercel Firewall rule.
- **Clear errors:** a bad body, the rate limit, a missing key, a rejected key, OpenAI being busy or out of quota, and a timeout (30 s) each get their own message. Details stay in the server log.

## Stretch: a week of data for 5,000 communities without hitting rate limits

`conversations.history` returns only thread parents, so every thread needs its own `conversations.replies` call. Slack applies rate limits per app, per workspace and per method. For apps not approved for the Slack Marketplace, both methods are now limited to 1 request per minute and 15 messages per call ([Slack changelog](https://docs.slack.dev/changelog/2025/05/29/rate-limit-changes-for-non-marketplace-apps)). So the biggest saving is not making calls at all.

1. **Only fetch threads that changed.** *(My idea.)* Store each thread's last-seen `reply_count`. Each week, read the parents and call `conversations.replies` only for threads whose `reply_count` changed. Unchanged threads cost nothing and old threads are never fetched again. A new question with `reply_count` 0 needs no call at all, because it's unanswered by definition. This came from my first idea for counting weekly replies: snapshot `reply_count` at each week boundary and subtract. That doesn't work inside `buildDigest`, because there's one export rather than a snapshot per week, and `reply_count` includes bot replies and replies after the week. But it's exactly the right check for deciding what to fetch. Parents also carry `latest_reply`, which catches the rare case where a deleted reply and a new one leave the count unchanged.
2. **Query with an `oldest` timestamp.** Call `conversations.history` with `oldest` set to the start of a look-back window, so it returns only parents recent enough to still get replies. Call `conversations.replies` with `oldest` set to the newest reply already stored, so it returns only new replies. A longer window catches more revived old threads but costs more history pages, so the window size is a setting to tune.
3. **A queue per workspace, with backoff on 429s.** Limits are per workspace, so give each workspace its own queue and rate limiter and run workspaces in parallel: 5,000 communities don't share one budget. On a 429 response, wait for the `Retry-After` header, then retry with exponential backoff and jitter. Store the pagination cursor and the per-thread progress so a retried job picks up where it stopped.
4. **Spread the 5,000 communities over the weekend.** At 1 call per minute, a busy workspace with 300 changed threads needs 5 hours of `conversations.replies` calls, so fetching can't all start Monday at midnight. Give each community a start slot between Saturday and Sunday evening (5,000 over about 44 hours is one start every 30 seconds). That gives every workspace a long window and keeps our own workers and database load steady. Early Monday, a small top-up pass with `oldest` set to each community's last fetch picks up the last few hours. `buildDigest` then runs on the stored messages, not the live API.

Going further, subscribing to message events with the Events API during the week would record which threads got replies as it happens, so Monday's job would only fetch those.
