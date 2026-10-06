// Shared helpers for the D1-backed API routes (likes, quiz).
import { env } from "cloudflare:workers";

const JSON_HEADERS = { "Content-Type": "application/json" };

export const json = (/** @type {unknown} */ data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });

// Post slugs and quiz ids are kebab-case. Anything else is not ours, and
// rejecting it keeps junk rows out of D1.
const KEY_PATTERN = /^[a-z0-9-]{1,80}$/;

export const isValidKey = (/** @type {string | undefined} */ key) =>
  typeof key === "string" && KEY_PATTERN.test(key);

/**
 * True when this IP has used up its writes for the window. The binding only
 * exists on Cloudflare (see `ratelimits` in wrangler.jsonc); when it is missing,
 * as in plain `astro dev`, nothing is limited.
 * @param {Request} request
 */
export async function isRateLimited(request) {
  const limiter = env.API_RATE_LIMITER;
  if (!limiter) return false;
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  try {
    const { success } = await limiter.limit({ key: ip });
    return !success;
  } catch {
    // A limiter outage should not take likes and votes down with it.
    return false;
  }
}

export const tooManyRequests = () => json({ error: "Too many requests" }, 429);
