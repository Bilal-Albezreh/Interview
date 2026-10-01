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
| `src/duplicates.ts` | `findDuplicateQuestions`: questions several people asked this week |
| `src/answered-before.ts` | `findAnsweredBefore`: an earlier, answered copy of each question still waiting |
| `src/health.ts` | `communityHealth`: answer rate and median time to first answer, against last week |
| `src/types.ts` | `SlackMessage` and `Digest` types |
| `src/run.ts` | Script behind `npm run digest` |
| `data/sample-messages.json` | 11 messages, so you can get a feel for the data |
| `data/sample-digest.json` | The digest those 11 messages should produce |
| `data/messages.json` | The full channel export (551 messages) |
| `test/sample.test.ts` | The two starter tests |
| `test/digest.test.ts` | One test per rule and edge case, on small hand-built messages |
| `test/classify.test.ts` | The word-list rules, mostly with real messages from the export |
| `test/full-export.test.ts` | Spot checks on `data/messages.json`, expected values worked out by reading the data |
| `test/duplicates.test.ts` | Duplicate questions: the real repeats in the export, plus near-misses that must stay apart |
| `test/answered-before.test.ts` | Earlier answers: the landing-page match, a near-miss, and the answer rules on hand-built messages |
| `test/health.test.ts` | Health metrics on hand-built messages (including a bot-only reply), plus checks against `buildDigest` |
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

The page is the Monday digest an admin would receive. A full-width top bar holds the title, the week and the dataset switch. Below it, on desktop, the digest takes the left column (about 60%), and a sticky panel on the right holds the Slack preview and "Test it yourself". On phones it's one column, digest first.

- **Top bar:** "Monday digest", the week, and a switch between the sample and the full export. `buildDigest` runs on the server when the site is built, so only the digests reach the browser.
- **Top threads:** each with an inline bar: a faint full-width track with a teal running-stitch fill whose length matches its replies this week, next to a right-aligned count. The fill is rounded to whole stitches so it never ends in a stub, and it draws in once on first load (not with reduced motion).
- **Waiting for an answer:** the unanswered questions, most nudged first, with their nudge count ("+1, same question" replies and bumps). Askers appear as small round avatars (initials and a stable colour from the user ID, with the full ID in the tooltip) instead of raw Slack IDs. The first 8 show; the rest are one click away. `buildDigest` sorts by this count but doesn't return it, so `web/lib/nudges.ts` recounts it with the same rule, and a test checks the two agree. Underneath, "Asked more than once" lists the duplicate groups, with how many of each group's posts are still waiting.
- **Summary:** the AI summary shown as a Slack-style message. The same call also returns a mood read for the week (Upbeat, Mixed or Frustrated), shown above it as a small three-step "AI read" meter with one sentence why and two or three checked quotes underneath. Below the message is "Copy as Block Kit JSON" (header, section and divider blocks, within Slack's size limits, with `&`, `<` and `>` escaped so message text can't ping the channel).
- **Test it yourself:** collapsed by default under the summary. Paste or upload a messages JSON (up to 2 MB), pick the week start, and build the digest. It's validated with zod and runs entirely in the browser, with presets for the sample, the full export and an empty channel, and no AI summary. Below it, the self-check shows Pass or Fail for the sample against `sample-digest.json`.

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
- **OpenAI gets message text, never who wrote it.** It receives the digest's text and counts, plus the text of this week's top-level posts and replies from people (for the mood read). No Slack user IDs, timestamps, bot posts or channel joins are sent, and any `<@U…>` mention inside a message is replaced with "@someone". The prompt tells the model to treat all of it as quoted data, not instructions. The reply is shown as plain text, never HTML.
- **Quotes are checked, not trusted.** The mood read's evidence quotes are kept only if they appear word for word in one of the messages that were sent (allowing for curly quote marks and spacing), at most three. Any others are dropped, and a malformed mood read is dropped without losing the summary.
- **Rate limit:** 5 requests per minute per IP. The counts are kept in server memory, so on Vercel each instance counts separately and a cold start resets them. That's fine for a demo; production would use shared storage (Vercel KV, Upstash) or a Vercel Firewall rule.
- **Clear errors:** a bad body, the rate limit, a missing key, a rejected key, OpenAI being busy or out of quota, and a timeout (30 s) each get their own message. Details stay in the server log.

## Stretch: duplicate questions

`findDuplicateQuestions(messages, weekStart)` in `src/duplicates.ts` is a separate function, so `buildDigest` and the `Digest` type are unchanged. It returns each group of questions asked by **two or more different people** this week:

```ts
{ text: string; askers: string[]; ts: string[] } // first wording, distinct askers in order, every ts oldest first
```

**How it matches.** It looks at the same questions `buildDigest` does: top-level posts from people, posted this week.
1. **Normalise:** lowercase, drop Slack links and mentions, punctuation and filler words ("is there a way to", "does anyone know", "how do you", …). What's left is what the question is about: "Is there a way to schedule posts in advance?" becomes {schedule, posts, advance}.
2. **Group:** oldest first, each question joins a group if it shares at least 60% of its words with that group's *first* question; otherwise it starts its own. Comparing with the first question, not the latest, stops a group drifting from A to B to C.
3. **Report:** only groups with two or more different askers, most-asked first. One person reposting their own question isn't a duplicate.

**On this export** it finds the 8 questions asked more than once this week. "Who owns community at your company, marketing or CS?" was asked by 3 people. Copies posted outside the week are left out (for example, "Are polls anonymous by default?" was also asked on Sep 14).

**Near-misses it keeps apart**, each covered by a test:
- "Curious how people handle offboarding members…" vs "How do you handle members who only ever post self-promotion?": the same topic words, a different question (25% overlap).
- "Is there a way to schedule posts…" vs "Is there a way to see who RSVP'd…": 33% of their raw words match, all filler; 0% of their content words do.
- "How do I export members to a CSV?" vs "How do I import members from a CSV?": 50% overlap, under the bar. Word overlap can't tell export from import, so the threshold has to.

**Limits.** This only catches reposts and light rewording. It has no stemming or synonyms, so "How do I add members in bulk?" and "How do I bulk-import members from a CSV?" stay apart. Embeddings, or an AI pass over the week's questions, would catch rephrased duplicates like that. Either way, a person should confirm a merge before members are pointed to someone else's answer, because a wrong merge sends someone to an answer for a different question.

## Already answered

`findAnsweredBefore(messages, weekStart)` in `src/answered-before.ts` is a separate function; `buildDigest` and the `Digest` type are unchanged. For each question `buildDigest` lists as unanswered, it looks for an **earlier** question anywhere in the export that:
- asked the same thing, matched with `findDuplicateQuestions`' normalisation and 60% bar, and
- got a real answer before the week ended, using the `classify.ts` rules (someone other than the asker, not a bot, not "+1" or a reaction).

It returns `{ question, earlier, answer }`, where `answer` is the earlier question's first real answer. If several earlier questions match, the closest wording wins, then the most recent.

**On this export,** 9 of the 20 waiting questions have an earlier answer. For example, the Sep 27 landing-page question points to the same question asked on Sep 24, whose first real answer came at 01:57 UTC on Sep 25. A more recent answered question that shares "handle" and "members" with the offboarding question is correctly left out.

**In the demo,** a note under the waiting question reads "Answered before on Sep 25, in a thread from Sep 24", followed by the quoted answer and a **Copy reply** button. The button copies a short, friendly reply quoting that answer. The reply names no one, so pasting it can't ping anybody, and nothing is posted automatically.

**Limits.** It matches the question, not whether the earlier answer is right. In this export, replies are paired with questions at random, so some earlier "answers" don't fit; "Are polls anonymous by default?" points to "What worked best for us was a weekly prompt from the team." That's why it's a reply for an admin to read before pasting, not an automatic one.

## Community health metrics

`communityHealth(messages, weekStart)` in `src/health.ts` is a separate function, so `buildDigest` and the `Digest` type are unchanged. It reports two numbers for the week and the same two for the 7 days before, plus the change:

- **Answer rate:** questions answered within the week, divided by questions asked. It uses `buildDigest`'s rules from `classify.ts`, so "answered" means a real answer from someone other than the asker before the week ends. Questions minus answered always equals the number of unanswered questions `buildDigest` lists, and a test checks that on the real export for both weeks.
- **Median time to first answer,** in hours, over the answered questions. It's measured to the first reply that counts as an answer, so bot replies, "+1"/"me too" replies, bumps, reactions and the asker's own replies are skipped.

The demo shows them in one quiet row at the top of the digest, with the change spelled out ("down 15 points", "2.0 hours faster"), because a signed "-2 h" is ambiguous when lower is better.

| On the full export | Questions | Answered | Answer rate | Median time to first answer |
| --- | --- | --- | --- | --- |
| Week of Sep 21 | 45 | 25 | 56% | 9.9 hours |
| Week of Sep 14 | 37 | 26 | 70% | 11.9 hours |
| Change | | | down 15 points | 2.0 hours faster |

**Read with care:**
- **Late-week questions have less time.** A question posted on Sunday evening has only hours to be answered before the week closes, so the answer rate leans low for questions near the end of the week.
- **The median only covers answered questions.** A week can get faster answers while answering fewer questions, as this one did, so read the two numbers together.
- **The previous week is slightly short.** The export starts at 01:01 UTC on Sep 14, so it's missing its first hour.
- **Small weeks are noisy.** With only a handful of questions, one answer moves the rate a lot. The sample has 2 questions and no previous week, so its row says there's nothing to compare.

## Stretch: a week of data for 5,000 communities without hitting rate limits

`conversations.history` returns only thread parents, so every thread needs its own `conversations.replies` call. Slack applies rate limits per app, per workspace and per method. For apps not approved for the Slack Marketplace, both methods are now limited to 1 request per minute and 15 messages per call ([Slack changelog](https://docs.slack.dev/changelog/2025/05/29/rate-limit-changes-for-non-marketplace-apps)). So the biggest saving is not making calls at all.

1. **Only fetch threads that changed.** *(My idea.)* Store each thread's last-seen `reply_count`. Each week, read the parents and call `conversations.replies` only for threads whose `reply_count` changed. Unchanged threads cost nothing and old threads are never fetched again. A new question with `reply_count` 0 needs no call at all, because it's unanswered by definition. This came from my first idea for counting weekly replies: snapshot `reply_count` at each week boundary and subtract. That doesn't work inside `buildDigest`, because there's one export rather than a snapshot per week, and `reply_count` includes bot replies and replies after the week. But it's exactly the right check for deciding what to fetch. Parents also carry `latest_reply`, which catches the rare case where a deleted reply and a new one leave the count unchanged.
2. **Query with an `oldest` timestamp.** Call `conversations.history` with `oldest` set to the start of a look-back window, so it returns only parents recent enough to still get replies. Call `conversations.replies` with `oldest` set to the newest reply already stored, so it returns only new replies. A longer window catches more revived old threads but costs more history pages, so the window size is a setting to tune.
3. **A queue per workspace, with backoff on 429s.** Limits are per workspace, so give each workspace its own queue and rate limiter and run workspaces in parallel: 5,000 communities don't share one budget. On a 429 response, wait for the `Retry-After` header, then retry with exponential backoff and jitter. Store the pagination cursor and the per-thread progress so a retried job picks up where it stopped.
4. **Spread the 5,000 communities over the weekend.** At 1 call per minute, a busy workspace with 300 changed threads needs 5 hours of `conversations.replies` calls, so fetching can't all start Monday at midnight. Give each community a start slot between Saturday and Sunday evening (5,000 over about 44 hours is one start every 30 seconds). That gives every workspace a long window and keeps our own workers and database load steady. Early Monday, a small top-up pass with `oldest` set to each community's last fetch picks up the last few hours. `buildDigest` then runs on the stored messages, not the live API.

Going further, subscribing to message events with the Events API during the week would record which threads got replies as it happens, so Monday's job would only fetch those.
