/**
 * @fileoverview Catch-all authentication route handler. Delegates all auth
 * requests (sign-in, sign-up, session, etc.) to the better-auth library.
 */
import { initAuth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export async function GET(request: Request) {
  return toNextJsHandler(await initAuth()).GET(request);
}

export async function POST(request: Request) {
  return toNextJsHandler(await initAuth()).POST(request);
}
