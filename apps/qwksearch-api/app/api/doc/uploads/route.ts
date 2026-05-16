/**
 * @fileoverview File upload and management via Cloudflare R2. POST uploads
 * files (PDF, DOCX, TXT, HTML), extracts text content, and stores both
 * original and extracted data. GET retrieves extracted content by file ID.
 * DELETE removes uploaded files and their extracted data.
 */
import { NextResponse } from "next/server";
import crypto from "crypto";

import {
  uploadFile,
  downloadFile,
  deleteFile,
} from "@/lib/integrations/cloudStorageService";
import { R2Credentials } from "@/types/fileSource";
import { getEnv } from "@/lib/env";

interface FileRes {
  fileName: string;
  fileExtension: string;
  fileId: string;
}

function getR2Credentials(): R2Credentials {
  const accountId = getEnv("R2_ACCOUNT_ID");
  const accessKeyId = getEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = getEnv("R2_SECRET_ACCESS_KEY");
  const bucket = getEnv("R2_UPLOADS_BUCKET") || "qwksearch-uploads";

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials not configured");
  }

  return { accountId, accessKeyId, secretAccessKey, bucket };
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const credentials = getR2Credentials();

    const processedFiles: FileRes[] = [];

    await Promise.all(
      files.map(async (file: File) => {
        const fileExtension = file.name.split(".").pop()?.toLowerCase();
        if (
          !fileExtension ||
          !["pdf", "txt", "html", "htm"].includes(fileExtension)
        ) {
          return NextResponse.json(
            { message: "File type not supported" },
            { status: 400 },
          );
        }

        const fileId = crypto.randomBytes(16).toString("hex");
        const uniqueFileName = `${fileId}.${fileExtension}`;
        const buffer = Buffer.from(await file.arrayBuffer());

        // Upload original file to R2
        await uploadFile(
          { provider: "r2", credentials },
          uniqueFileName,
          buffer,
        );

        // Extract text content based on file type
        let fullText = "";
        if (
          fileExtension === "txt" ||
          fileExtension === "html" ||
          fileExtension === "htm"
        ) {
          fullText = buffer.toString("utf-8");
        }

        // Upload extracted data as JSON to R2
        const extractedData = JSON.stringify({
          title: file.name,
          content: fullText,
        });
        await uploadFile(
          { provider: "r2", credentials },
          `${fileId}-extracted.json`,
          extractedData,
        );

        processedFiles.push({
          fileName: file.name,
          fileExtension: fileExtension,
          fileId: fileId,
        });
      }),
    );

    return NextResponse.json({
      files: processedFiles,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { message: "An error has occurred." },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json(
        { message: "File ID is required" },
        { status: 400 },
      );
    }

    const credentials = getR2Credentials();
    const extractedKey = `${fileId}-extracted.json`;

    const content = await downloadFile(
      { provider: "r2", credentials },
      extractedKey,
    );

    return NextResponse.json(JSON.parse(content));
  } catch (error) {
    console.error("Error fetching file:", error);
    return NextResponse.json({ message: "File not found" }, { status: 404 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get("fileId");
    const fileExtension = searchParams.get("ext");

    if (!fileId) {
      return NextResponse.json(
        { message: "File ID is required" },
        { status: 400 },
      );
    }

    const credentials = getR2Credentials();
    const results: { key: string; success: boolean }[] = [];

    // Delete extracted JSON
    try {
      const extractedResult = await deleteFile(
        { provider: "r2", credentials },
        `${fileId}-extracted.json`,
      );
      results.push({
        key: `${fileId}-extracted.json`,
        success: extractedResult.success,
      });
    } catch (error) {
      results.push({ key: `${fileId}-extracted.json`, success: false });
    }

    // Delete original file if extension provided
    if (fileExtension) {
      try {
        const originalResult = await deleteFile(
          { provider: "r2", credentials },
          `${fileId}.${fileExtension}`,
        );
        results.push({
          key: `${fileId}.${fileExtension}`,
          success: originalResult.success,
        });
      } catch (error) {
        results.push({ key: `${fileId}.${fileExtension}`, success: false });
      }
    } else {
      // Try common extensions if not provided
      const extensions = ["pdf", "txt", "html", "htm"];
      for (const ext of extensions) {
        try {
          await deleteFile({ provider: "r2", credentials }, `${fileId}.${ext}`);
          results.push({ key: `${fileId}.${ext}`, success: true });
          break;
        } catch {
          // File with this extension doesn't exist, continue
        }
      }
    }

    return NextResponse.json({
      success: true,
      fileId,
      deleted: results,
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { message: "Failed to delete file" },
      { status: 500 },
    );
  }
}
