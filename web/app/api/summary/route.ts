import { z } from "zod";
import { DATASET_NAMES } from "@/lib/datasets";
import { digestFor } from "@/lib/digests";
import { createRateLimiter } from "@/lib/rate-limit";
import { createClient, DEFAULT_MODEL, SummaryError, writeSummary } from "@/lib/summarize";

export const runtime = "nodejs";

// Only a dataset name is accepted, never text, so nobody can send their own prompt
// through our key. The digest is rebuilt here rather than trusted from the browser.
const Body = z.object({ dataset: z.enum(DATASET_NAMES) });

const limiter = createRateLimiter({ limit: 5, windowMs: 60_000 });

export async function POST(request: Request) {
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return errorResponse(400, 'Unknown dataset. Send {"dataset": "sample"} or {"dataset": "full"}.');
  }

  const limit = limiter(clientIp(request));
  if (!limit.ok) {
    return errorResponse(
      429,
      `Too many summaries from your connection. Try again in ${limit.retryAfterSeconds} s.`,
      { "Retry-After": String(limit.retryAfterSeconds) },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return errorResponse(500, "AI summaries aren't configured on this server (OPENAI_API_KEY is missing).");
  }

  try {
    const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
    const summary = await writeSummary(digestFor(body.data.dataset), createClient(apiKey), model);
    return Response.json({ summary });
  } catch (err) {
    // Full details stay in the server log; the browser only gets the safe message.
    console.error("AI summary failed:", err instanceof SummaryError ? (err.cause ?? err) : err);
    if (err instanceof SummaryError) return errorResponse(err.status, err.message);
    return errorResponse(500, "Something went wrong writing the summary. Try again.");
  }
}

// Vercel sets x-forwarded-for itself, so its first entry is the caller's IP.
function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown"
  );
}

function errorResponse(status: number, message: string, headers?: HeadersInit) {
  return Response.json({ error: message }, { status, headers });
}
