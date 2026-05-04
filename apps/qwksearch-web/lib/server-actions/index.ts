import grab from "grab-url";
import { Message } from "../../components/ResearchAgent/ChatConversation/ChatWindow";

export const getSuggestions = async (chatHistory: Message[]) => {
  const chatModel = localStorage.getItem("chatModelKey");
  const chatModelProvider = localStorage.getItem("chatModelProviderId");

  // Only send user/assistant messages — source messages contain large Document
  // objects that bloat the payload and are not needed for suggestion generation.
  const filteredHistory = chatHistory.filter(
    (msg) => msg.role === "user" || msg.role === "assistant",
  );

  try {
    const data = await grab<{ suggestions: string[] }>(
      `/api/agent/suggestions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: {
          chatHistory: filteredHistory,
          chatModel: {
            providerId: chatModelProvider,
            key: chatModel,
          },
        },
      },
    );

    return Array.isArray(data.suggestions) ? data.suggestions : [];
  } catch (e) {
    return [];
  }
};
