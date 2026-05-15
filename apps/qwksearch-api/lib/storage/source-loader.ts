// Storage loader for different file sources

import { AnyFileSource, GoogleDocsCredentials, TursoDBCredentials, SSHCredentials, S3Credentials, R2Credentials, B2Credentials } from '@/types/fileSource';
import { Document } from '@/lib/database/schema';

// Dynamic import to avoid bundling Node.js-only code in client
const getCloudStorageService = async () => {
  if (typeof window !== 'undefined') {
    throw new Error('Cloud storage operations must be performed server-side');
  }
  return import('@/lib/integrations/cloudStorageService');
};

/**
 * Load documents from the active file source
 */
export async function loadDocumentsFromSource(
  source: AnyFileSource,
  localDocuments: Document[]
): Promise<Document[]> {
  switch (source.type) {
    case 'local':
      // Return local documents from localStorage
      return localDocuments;

    case 'gdocs':
      return await loadFromGoogleDocs(source.credentials as GoogleDocsCredentials);

    case 'turso':
      return await loadFromTursoDB(source.credentials as TursoDBCredentials);

    case 'ssh':
      return await loadFromSSH(source.credentials as SSHCredentials);

    case 's3':
      return await loadFromS3(source.credentials as S3Credentials);

    case 'r2':
      return await loadFromR2(source.credentials as R2Credentials);

    case 'b2':
      return await loadFromB2(source.credentials as B2Credentials);

    default:
      console.warn(`Unknown source type: ${(source as any).type}`);
      return localDocuments;
  }
}

/**
 * Load documents from Google Docs
 */
async function loadFromGoogleDocs(credentials: GoogleDocsCredentials): Promise<Document[]> {
  if (!credentials.isAuthenticated) {
    console.warn('Google Docs source not authenticated');
    return [];
  }

  try {
    // TODO: Implement actual Google Docs API integration
    // This would call the Google Drive API to list files in the specified folders
    // and convert them to Document format

    const folderIds = credentials.folderIds || [];
    console.log('Loading from Google Docs folders:', folderIds);

    // Placeholder - would make API calls to:
    // 1. List files in each folder
    // 2. Fetch document content
    // 3. Convert to Document format

    return [];
  } catch (error) {
    console.error('Error loading from Google Docs:', error);
    return [];
  }
}

/**
 * Load documents from Turso DB
 */
async function loadFromTursoDB(credentials: TursoDBCredentials): Promise<Document[]> {
  try {
    // TODO: Implement Turso DB integration
    // This would connect to the Turso database and query documents

    console.log('Loading from Turso DB:', credentials.endpoint);

    // If Google Docs sync is enabled, also fetch from Google Docs
    if (credentials.enableGoogleDocsSync) {
      console.log('Turso DB Google Docs sync enabled');
      // Would fetch synced Google Docs from Turso DB
    }

    return [];
  } catch (error) {
    console.error('Error loading from Turso DB:', error);
    return [];
  }
}

/**
 * Load documents from SSH server
 */
async function loadFromSSH(credentials: SSHCredentials): Promise<Document[]> {
  try {
    // TODO: Implement SSH file system integration
    // This would connect via SSH and list files in the base path

    console.log('Loading from SSH:', `${credentials.username}@${credentials.host}:${credentials.port}`);

    return [];
  } catch (error) {
    console.error('Error loading from SSH:', error);
    return [];
  }
}

/**
 * Load documents from Amazon S3
 */
async function loadFromS3(credentials: S3Credentials): Promise<Document[]> {
  try {
    console.log('Loading from S3:', `${credentials.bucket} (${credentials.region})`);

    const { listFiles, downloadFile } = await getCloudStorageService();

    // List all files in the S3 bucket
    const files = await listFiles({
      provider: 's3',
      credentials,
    });

    // Filter for markdown/document files and apply basePath filter if specified
    const basePath = credentials.basePath || '';
    const documentFiles = files.filter(key => {
      const matchesPath = !basePath || key.startsWith(basePath);
      const isDocument = key.endsWith('.md') || key.endsWith('.txt') || key.endsWith('.json');
      return matchesPath && isDocument;
    });

    // Download and convert each file to a Document
    const documents: Document[] = await Promise.all(
      documentFiles.map(async (key) => {
        try {
          const content = await downloadFile({ provider: 's3', credentials }, key);
          const fileName = key.split('/').pop() || key;

          // Create a temporary ID based on the key (will be replaced when saved to DB)
          const tempId = Math.floor(Math.random() * 1000000);
          const now = new Date().toISOString();

          return {
            id: tempId,
            name: fileName,
            title: fileName.replace(/\.(md|txt|json)$/, ''),
            content,
            isFolder: 0,
            type: 0,
            parentId: null,
            isExpanded: 0,
            createdAt: now,
            updatedAt: now,
            userId: null,
            url: null,
            cite: null,
            author: null,
            html: null,
            summary: null,
            metadata: null,
            sharing: null,
          } as Document;
        } catch (error) {
          console.error(`Error loading file ${key}:`, error);
          return null;
        }
      })
    );

    return documents.filter((doc): doc is Document => doc !== null);
  } catch (error) {
    console.error('Error loading from S3:', error);
    return [];
  }
}

/**
 * Load documents from Cloudflare R2
 */
async function loadFromR2(credentials: R2Credentials): Promise<Document[]> {
  try {
    console.log('Loading from R2:', credentials.bucket);

    const { listFiles, downloadFile } = await getCloudStorageService();

    // List all files in the R2 bucket
    const files = await listFiles({
      provider: 'r2',
      credentials,
    });

    // Filter for markdown/document files and apply basePath filter if specified
    const basePath = credentials.basePath || '';
    const documentFiles = files.filter(key => {
      const matchesPath = !basePath || key.startsWith(basePath);
      const isDocument = key.endsWith('.md') || key.endsWith('.txt') || key.endsWith('.json');
      return matchesPath && isDocument;
    });

    // Download and convert each file to a Document
    const documents: Document[] = await Promise.all(
      documentFiles.map(async (key) => {
        try {
          const content = await downloadFile({ provider: 'r2', credentials }, key);
          const fileName = key.split('/').pop() || key;

          // Create a temporary ID based on the key (will be replaced when saved to DB)
          const tempId = Math.floor(Math.random() * 1000000);
          const now = new Date().toISOString();

          return {
            id: tempId,
            name: fileName,
            title: fileName.replace(/\.(md|txt|json)$/, ''),
            content,
            isFolder: 0,
            type: 0,
            parentId: null,
            isExpanded: 0,
            createdAt: now,
            updatedAt: now,
            userId: null,
            url: null,
            cite: null,
            author: null,
            html: null,
            summary: null,
            metadata: null,
            sharing: null,
          } as Document;
        } catch (error) {
          console.error(`Error loading file ${key}:`, error);
          return null;
        }
      })
    );

    return documents.filter((doc): doc is Document => doc !== null);
  } catch (error) {
    console.error('Error loading from R2:', error);
    return [];
  }
}

/**
 * Load documents from Backblaze B2
 */
async function loadFromB2(credentials: B2Credentials): Promise<Document[]> {
  try {
    console.log('Loading from B2:', credentials.bucket);

    const { listFiles, downloadFile } = await getCloudStorageService();

    // List all files in the B2 bucket
    const files = await listFiles({
      provider: 'b2',
      credentials,
    });

    // Filter for markdown/document files and apply basePath filter if specified
    const basePath = credentials.basePath || '';
    const documentFiles = files.filter(key => {
      const matchesPath = !basePath || key.startsWith(basePath);
      const isDocument = key.endsWith('.md') || key.endsWith('.txt') || key.endsWith('.json');
      return matchesPath && isDocument;
    });

    // Download and convert each file to a Document
    const documents: Document[] = await Promise.all(
      documentFiles.map(async (key) => {
        try {
          const content = await downloadFile({ provider: 'b2', credentials }, key);
          const fileName = key.split('/').pop() || key;

          // Create a temporary ID based on the key (will be replaced when saved to DB)
          const tempId = Math.floor(Math.random() * 1000000);
          const now = new Date().toISOString();

          return {
            id: tempId,
            name: fileName,
            title: fileName.replace(/\.(md|txt|json)$/, ''),
            content,
            isFolder: 0,
            type: 0,
            parentId: null,
            isExpanded: 0,
            createdAt: now,
            updatedAt: now,
            userId: null,
            url: null,
            cite: null,
            author: null,
            html: null,
            summary: null,
            metadata: null,
            sharing: null,
          } as Document;
        } catch (error) {
          console.error(`Error loading file ${key}:`, error);
          return null;
        }
      })
    );

    return documents.filter((doc): doc is Document => doc !== null);
  } catch (error) {
    console.error('Error loading from B2:', error);
    return [];
  }
}

/**
 * Save document to the active file source
 */
export async function saveDocumentToSource(
  source: AnyFileSource,
  document: Document
): Promise<boolean> {
  // TODO: Implement saving to different sources
  console.log('Saving document to source:', source.type, document.id);

  // For now, only local storage is supported
  if (source.type === 'local') {
    return true;
  }

  return false;
}

/**
 * Delete document from the active file source
 */
export async function deleteDocumentFromSource(
  source: AnyFileSource,
  documentId: string
): Promise<boolean> {
  // TODO: Implement deletion from different sources
  console.log('Deleting document from source:', source.type, documentId);

  // For now, only local storage is supported
  if (source.type === 'local') {
    return true;
  }

  return false;
}
