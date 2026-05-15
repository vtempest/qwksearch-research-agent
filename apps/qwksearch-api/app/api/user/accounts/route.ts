/**
 * @fileoverview Linked social accounts API. GET lists all OAuth accounts
 * linked to the current user.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDB } from "@/lib/database";
import { account as accountTable } from "@/lib/database/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const db = getDB();
  const accounts = await db
    .select({
      id: accountTable.id,
      providerId: accountTable.providerId,
      accountId: accountTable.accountId,
      createdAt: accountTable.createdAt,
    })
    .from(accountTable)
    .where(eq(accountTable.userId, session.user.id));

  return NextResponse.json(accounts);
}
