import type { Document } from "@/lib/database/schema";
import grab from "grab-url";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export const documentsApi = {
  // Get all documents
  async getAll(): Promise<Document[]> {
    const result: ApiResponse<Document[]> = await grab(
      `${API_BASE_URL}/documents`,
    );

    if (!result.success) {
      throw new Error(result.error || "Failed to fetch documents");
    }

    return result.data || [];
  },

  // Get a single document
  async getById(id: string): Promise<Document> {
    const result: ApiResponse<Document> = await grab(
      `${API_BASE_URL}/documents/${id}`,
    );

    if (!result.success) {
      throw new Error(result.error || "Failed to fetch document");
    }

    return result.data!;
  },

  // Create a new document
  async create(data: {
    title: string;
    content?: string;
    parentId?: string | null;
  }): Promise<Document> {
    const result: ApiResponse<Document> = await grab(
      `${API_BASE_URL}/documents`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );

    if (!result.success) {
      throw new Error(result.error || "Failed to create document");
    }

    return result.data!;
  },

  // Update a document
  async update(id: string, updates: Partial<Document>): Promise<Document> {
    const result: ApiResponse<Document> = await grab(
      `${API_BASE_URL}/documents/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(updates),
      },
    );

    if (!result.success) {
      throw new Error(result.error || "Failed to update document");
    }

    return result.data!;
  },

  // Delete a document
  async delete(id: string): Promise<void> {
    const result: ApiResponse = await grab(`${API_BASE_URL}/documents/${id}`, {
      method: "DELETE",
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to delete document");
    }
  },

  // Duplicate a document
  async duplicate(id: string): Promise<Document> {
    const result: ApiResponse<Document> = await grab(
      `${API_BASE_URL}/documents/${id}/duplicate`,
      {
        method: "POST",
      },
    );

    if (!result.success) {
      throw new Error(result.error || "Failed to duplicate document");
    }

    return result.data!;
  },

  // Move a document
  async move(
    draggedId: string,
    targetId: string | null,
    position: "before" | "after" | "child",
  ): Promise<void> {
    const result: ApiResponse = await grab(`${API_BASE_URL}/documents/move`, {
      method: "POST",
      body: JSON.stringify({ draggedId, targetId, position }),
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to move document");
    }
  },

  // Search documents
  async search(query: string): Promise<Document[]> {
    const result: ApiResponse<Document[]> = await grab(
      `${API_BASE_URL}/documents/search/${encodeURIComponent(query)}`,
    );

    if (!result.success) {
      throw new Error(result.error || "Failed to search documents");
    }

    return result.data || [];
  },

  // Bulk update (for syncing local state)
  async bulkUpdate(documents: Document[]): Promise<Document[]> {
    const result: ApiResponse<Document[]> = await grab(
      `${API_BASE_URL}/documents/bulk`,
      {
        method: "POST",
        body: JSON.stringify({ documents }),
      },
    );

    if (!result.success) {
      throw new Error(result.error || "Failed to sync documents");
    }

    return result.data || [];
  },
};

// Google Docs Integration API
export const googleDocsApi = {
  // Get OAuth authorization URL
  async getAuthUrl(): Promise<string> {
    const result: ApiResponse<{ authUrl: string }> = await grab(
      `${API_BASE_URL}/google-docs/auth`,
    );

    if (!result.success) {
      throw new Error(result.error || "Failed to get auth URL");
    }

    return result.data!.authUrl;
  },

  // Export document to Google Docs
  async exportToGoogleDocs(
    documentId: string,
    accessToken: string,
    refreshToken?: string,
  ): Promise<{ googleDocId: string; url: string }> {
    const result: ApiResponse<{ googleDocId: string; url: string }> =
      await grab(`${API_BASE_URL}/google-docs/export`, {
        method: "POST",
        body: JSON.stringify({ documentId, accessToken, refreshToken }),
      });

    if (!result.success) {
      throw new Error(result.error || "Failed to export to Google Docs");
    }

    return result.data!;
  },

  // Import document from Google Docs
  async importFromGoogleDocs(
    googleDocId: string,
    accessToken: string,
    refreshToken?: string,
    parentId?: string | null,
  ): Promise<Document> {
    const result: ApiResponse<Document> = await grab(
      `${API_BASE_URL}/google-docs/import`,
      {
        method: "POST",
        body: JSON.stringify({
          googleDocId,
          accessToken,
          refreshToken,
          parentId,
        }),
      },
    );

    if (!result.success) {
      throw new Error(result.error || "Failed to import from Google Docs");
    }

    return result.data!;
  },

  // Share Google Doc with specific user
  async shareWithUser(
    googleDocId: string,
    emailAddress: string,
    accessToken: string,
    role: "reader" | "writer" | "commenter" = "reader",
    refreshToken?: string,
  ): Promise<void> {
    const result: ApiResponse = await grab(
      `${API_BASE_URL}/google-docs/share`,
      {
        method: "POST",
        body: JSON.stringify({
          googleDocId,
          emailAddress,
          role,
          accessToken,
          refreshToken,
        }),
      },
    );

    if (!result.success) {
      throw new Error(result.error || "Failed to share document");
    }
  },

  // Get shareable link for Google Doc
  async getShareableLink(
    googleDocId: string,
    accessToken: string,
    refreshToken?: string,
  ): Promise<string> {
    const result: ApiResponse<{ shareableLink: string }> = await grab(
      `${API_BASE_URL}/google-docs/share`,
      {
        method: "POST",
        body: JSON.stringify({
          googleDocId,
          accessToken,
          refreshToken,
          publicLink: true,
        }),
      },
    );

    if (!result.success) {
      throw new Error(result.error || "Failed to get shareable link");
    }

    return result.data!.shareableLink;
  },
};
