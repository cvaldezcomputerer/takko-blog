type D1ResultRow = Record<string, unknown>;

interface D1PreparedStatement {
  bind: (...values: unknown[]) => D1PreparedStatement;
  first: () => Promise<D1ResultRow | null>;
  all: () => Promise<{ results?: D1ResultRow[] }>;
}

interface D1DatabaseLike {
  prepare: (query: string) => D1PreparedStatement;
}

interface RateLimitLike {
  limit: (options: { key: string }) => Promise<{ success: boolean }>;
}

declare module "cloudflare:workers" {
  const env: {
    DB: D1DatabaseLike;
    SESSION: unknown;
    /** Missing in plain `astro dev`; see `ratelimits` in wrangler.jsonc. */
    API_RATE_LIMITER?: RateLimitLike;
  };
  export { env };
}
