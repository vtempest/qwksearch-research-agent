/**
 * @fileoverview Search chat history endpoint. Searches through chat titles
 * and message contents for authenticated users.
 */
import { getDB } from "@/lib/database";
import { chats, messages } from "@/lib/database/schema";
import { eq, and, or, like, sql } from "drizzle-orm";
import { requireUserId } from "@/lib/auth/session";

export const GET = async (req: Request) => {
  try {
    const db = getDB();
    const userId = await requireUserId();

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length === 0) {
      return Response.json({ chats: [] }, { status: 200 });
    }

    const searchTerm = `%${query.trim()}%`;

    // Search in chat titles
    const chatResults = await db
      .select({
        id: chats.id,
        title: chats.title,
        createdAt: chats.createdAt,
        focusMode: chats.focusMode,
        userId: chats.userId,
        files: chats.files,
      })
      .from(chats)
      .where(
        and(
          eq(chats.userId, userId),
          like(chats.title, searchTerm)
        )
      )
      .orderBy(sql`${chats.createdAt} DESC`);

    // Search in message contents
    const messageResults = await db
      .selectDistinct({
        id: chats.id,
        title: chats.title,
        createdAt: chats.createdAt,
        focusMode: chats.focusMode,
        userId: chats.userId,
        files: chats.files,
      })
      .from(messages)
      .innerJoin(chats, eq(messages.chatId, chats.id))
      .where(
        and(
          eq(chats.userId, userId),
          or(
            like(messages.content, searchTerm),
          )
        )
      )
      .orderBy(sql`${chats.createdAt} DESC`);

    // Combine and deduplicate results
    const combinedResults = [...chatResults, ...messageResults];
    const uniqueChats = Array.from(
      new Map(combinedResults.map(chat => [chat.id, chat])).values()
    );

    // Get message counts for the results
    const chatIds = uniqueChats.map(chat => chat.id);
    const messageCounts = await db
      .select({
        chatId: messages.chatId,
        count: sql<number>`count(*)`,
      })
      .from(messages)
      .where(
        and(
          sql`${messages.chatId} IN (${sql.join(chatIds.map(id => sql`${id}`), sql`, `)})`,
          eq(messages.role, "user")
        )
      )
      .groupBy(messages.chatId);

    const countMap = new Map(
      messageCounts.map(mc => [mc.chatId, Number(mc.count)])
    );

    const resultsWithCounts = uniqueChats.map(chat => ({
      ...chat,
      messageCount: countMap.get(chat.id) || 0,
    }));

    return Response.json({ chats: resultsWithCounts }, { status: 200 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return Response.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    console.error("Error searching chats:", err);
    return Response.json(
      { message: "An error has occurred." },
      { status: 500 }
    );
  }
};
