import { initAuth } from "./index";
import { headers } from "next/headers";

export interface AuthSession {
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
  };
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
}

/**
 * Get current session from request headers
 * Returns null if not authenticated
 */
export async function getSession(): Promise<AuthSession | null> {
  try {
    const auth = await initAuth();
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    return session;
  } catch (error) {
    console.error("Session retrieval error:", error);
    return null;
  }
}

/**
 * Get session or throw 401 error
 * Use this in protected API routes
 */
export async function requireSession(): Promise<AuthSession> {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  return session;
}

/**
 * Get user ID from session
 * Returns null if not authenticated
 */
export async function getUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id ?? null;
}

/**
 * Require user ID or throw
 */
export async function requireUserId(): Promise<string> {
  const session = await requireSession();
  return session.user.id;
}
