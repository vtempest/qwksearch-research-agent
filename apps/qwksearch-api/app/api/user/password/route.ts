/**
 * @fileoverview Password change API. POST changes the current user's password.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { initAuth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { currentPassword, newPassword } = body;

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json(
      { message: "New password must be at least 8 characters." },
      { status: 400 }
    );
  }

  try {
    const auth = await initAuth();
    await auth.api.changePassword({
      headers: await headers(),
      body: {
        currentPassword,
        newPassword,
        revokeOtherSessions: false,
      },
    });
    return NextResponse.json({ message: "Password changed successfully." });
  } catch (error: any) {
    console.error("Error changing password:", error);
    return NextResponse.json(
      { message: error?.message || "Failed to change password." },
      { status: 400 }
    );
  }
}
