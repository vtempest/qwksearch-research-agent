// Cloud storage service wrapper for manage-storage library
// Supports AWS S3, Cloudflare R2, and Backblaze B2
// NOTE: This module uses Node.js APIs - import dynamically via storageLoader.ts

import { manageStorage } from "manage-storage";
import {
  S3Credentials,
  R2Credentials,
  B2Credentials,
} from "@/types/fileSource";

export type CloudStorageProvider = "s3" | "r2" | "b2";

export interface CloudStorageOptions {
  provider: CloudStorageProvider;
  credentials: S3Credentials | R2Credentials | B2Credentials;
}

/**
 * Maps file source credentials to manage-storage format
 */
function mapCredentialsToStorageConfig(options: CloudStorageOptions) {
  const { provider, credentials } = options;

  if (provider === "s3") {
    const s3Creds = credentials as S3Credentials;
    return {
      provider: "amazon" as const,
      BUCKET_NAME: s3Creds.bucket,
      ACCESS_KEY_ID: s3Creds.accessKeyId,
      SECRET_ACCESS_KEY: s3Creds.secretAccessKey,
      BUCKET_URL:
        s3Creds.endpoint || `https://s3.${s3Creds.region}.amazonaws.com`,
      awsRegion: s3Creds.region,
    };
  } else if (provider === "r2") {
    const r2Creds = credentials as R2Credentials;
    return {
      provider: "cloudflare" as const,
      BUCKET_NAME: r2Creds.bucket,
      ACCESS_KEY_ID: r2Creds.accessKeyId,
      SECRET_ACCESS_KEY: r2Creds.secretAccessKey,
      BUCKET_URL: `https://${r2Creds.accountId}.r2.cloudflarestorage.com`,
    };
  } else if (provider === "b2") {
    const b2Creds = credentials as B2Credentials;
    return {
      provider: "backblaze" as const,
      BUCKET_NAME: b2Creds.bucket,
      ACCESS_KEY_ID: b2Creds.accessKeyId,
      SECRET_ACCESS_KEY: b2Creds.secretAccessKey,
      BUCKET_URL: b2Creds.endpoint || "https://s3.us-west-004.backblazeb2.com",
    };
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

/**
 * List all files in the bucket
 */
export async function listFiles(
  options: CloudStorageOptions
): Promise<string[]> {
  const config = mapCredentialsToStorageConfig(options);
  const files = await manageStorage("list", config);
  return files as string[];
}

/**
 * Upload a file to cloud storage
 */
export async function uploadFile(
  options: CloudStorageOptions,
  key: string,
  content: string | Buffer
): Promise<{ success: boolean; key: string }> {
  const config = mapCredentialsToStorageConfig(options);
  const result = await manageStorage("upload", {
    ...config,
    key,
    body: content,
  });
  return result as { success: boolean; key: string };
}

/**
 * Download a file from cloud storage
 */
export async function downloadFile(
  options: CloudStorageOptions,
  key: string
): Promise<string> {
  const config = mapCredentialsToStorageConfig(options);
  const data = await manageStorage("download", {
    ...config,
    key,
  });
  return data as string;
}

/**
 * Delete a file from cloud storage
 */
export async function deleteFile(
  options: CloudStorageOptions,
  key: string
): Promise<{ success: boolean; key: string }> {
  const config = mapCredentialsToStorageConfig(options);
  const result = await manageStorage("delete", {
    ...config,
    key,
  });
  return result as { success: boolean; key: string };
}

/**
 * Copy a file within cloud storage
 */
export async function copyFile(
  options: CloudStorageOptions,
  sourceKey: string,
  destinationKey: string
): Promise<{ success: boolean; sourceKey: string; destinationKey: string }> {
  const config = mapCredentialsToStorageConfig(options);
  const result = await manageStorage("copy", {
    ...config,
    key: sourceKey,
    destinationKey,
  });
  return result as {
    success: boolean;
    sourceKey: string;
    destinationKey: string;
  };
}

/**
 * Rename a file in cloud storage (copy + delete)
 */
export async function renameFile(
  options: CloudStorageOptions,
  oldKey: string,
  newKey: string
): Promise<{ success: boolean; oldKey: string; newKey: string }> {
  const config = mapCredentialsToStorageConfig(options);
  const result = await manageStorage("rename", {
    ...config,
    key: oldKey,
    destinationKey: newKey,
  });
  return result as { success: boolean; oldKey: string; newKey: string };
}

/**
 * Delete all files in the bucket (use with caution!)
 */
export async function deleteAllFiles(
  options: CloudStorageOptions
): Promise<{ success: boolean; count: number }> {
  const config = mapCredentialsToStorageConfig(options);
  const result = await manageStorage("deleteAll", config);
  return result as { success: boolean; count: number };
}

/**
 * Test connection to cloud storage
 */
export async function testConnection(
  options: CloudStorageOptions
): Promise<boolean> {
  try {
    await listFiles(options);
    return true;
  } catch (error) {
    console.error("Cloud storage connection test failed:", error);
    return false;
  }
}
