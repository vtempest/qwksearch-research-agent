/**
 * CLI-only auth export for `bun x @better-auth/cli generate`.
 * This file must NOT be imported by any Worker/edge code —
 * which is unavailable in the Cloudflare Workers runtime.
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI, anonymous } from "better-auth/plugins";

export const auth = betterAuth({
  database: drizzleAdapter(process.env.DATABASE_URL as any, {
    provider: "sqlite",
    usePlural: true,
  }),
  plugins: [openAPI(), anonymous()],
});
