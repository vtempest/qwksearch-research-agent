/**
 * @fileoverview Revoke a specific session by ID.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDB } from "@/lib/database";
import { session as sessionTable } from "@/lib/database/schema";
import { eq, and } from "drizzle-orm";
import { initAuth } from "@/lib/auth";
import { headers } from "next/headers";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentSession = await getSession();
  if (!currentSession) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify the session belongs to the current user
  const db = getDB();
  const [target] = await db
    .select({ token: sessionTable.token })
    .from(sessionTable)
    .where(
      and(
        eq(sessionTable.id, id),
        eq(sessionTable.userId, currentSession.user.id)
      )
    )
    .limit(1);

  if (!target) {
    return NextResponse.json({ message: "Session not found." }, { status: 404 });
  }

  try {
    const auth = await initAuth();
    await auth.api.revokeSession({
      headers: await headers(),
      body: { token: target.token },
    });
    return NextResponse.json({ message: "Session revoked successfully." });
  } catch (error) {
    console.error("Error revoking session:", error);
    return NextResponse.json(
      { message: "Failed to revoke session." },
      { status: 500 }
    );
  }
}
