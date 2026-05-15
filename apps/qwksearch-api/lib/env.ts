/**
 * Runtime env-var accessor for Cloudflare Workers (via @opennextjs/cloudflare).
 * Falls back to `process.env` when running outside a Worker (local dev / CLI).
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";

export function getEnv(key: string): string | undefined {
  try {
    const { env } = getCloudflareContext();
    return (env as Record<string, string | undefined>)[key];
  } catch {
    // Not in a Cloudflare Worker context (e.g. local dev, CLI)
    return process.env[key];
  }
}
