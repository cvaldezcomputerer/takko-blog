type D1ResultRow = Record<string, unknown>;

interface D1PreparedStatement {
  bind: (...values: unknown[]) => D1PreparedStatement;
  first: () => Promise<D1ResultRow | null>;
  all: () => Promise<{ results?: D1ResultRow[] }>;
}

interface D1DatabaseLike {
  prepare: (query: string) => D1PreparedStatement;
}

declare namespace App {
  interface Locals {
    runtime?: {
      env?: {
        DB?: D1DatabaseLike;
        RESEND_API_KEY?: string;
      };
    };
  }
}
