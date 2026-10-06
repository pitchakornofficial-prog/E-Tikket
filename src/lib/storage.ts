import fs from "fs/promises";
import path from "path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

export class StorageConfigurationError extends Error {
  constructor(message = "Cloudflare R2 storage is not configured") {
    super(message);
    this.name = "StorageConfigurationError";
  }
}

export class StorageOperationError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "StorageOperationError";
  }
}

let s3ClientInstance: S3Client | null = null;
let injectedFailureMode: "put" | "get" | "delete" | null = null;
let mockStorageMap: Map<string, { data: Buffer; contentType: string }> | null = null;

const LOCAL_STORAGE_DIR =
  process.env.LOCAL_STORAGE_DIR || path.join(process.cwd(), ".storage", "artifacts");

function getLocalFilePath(key: string): string {
  const normalizedKey = path.normalize(key).replace(/^(\.\.[\/\\])+/, "");
  return path.join(LOCAL_STORAGE_DIR, normalizedKey);
}

async function putLocalArtifact(
  key: string,
  data: Uint8Array | Buffer,
  contentType: string,
): Promise<void> {
  const filePath = getLocalFilePath(key);
  const metaPath = `${filePath}.meta.json`;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, data);
  await fs.writeFile(metaPath, JSON.stringify({ contentType }), "utf-8");
}

async function getLocalArtifact(
  key: string,
): Promise<{ data: Buffer; contentType: string } | null> {
  const filePath = getLocalFilePath(key);
  const metaPath = `${filePath}.meta.json`;
  try {
    const data = await fs.readFile(filePath);
    let contentType = "application/octet-stream";
    try {
      const metaContent = await fs.readFile(metaPath, "utf-8");
      const parsed = JSON.parse(metaContent);
      if (parsed?.contentType) {
        contentType = parsed.contentType;
      }
    } catch {
      if (key.endsWith(".jpg") || key.endsWith(".jpeg")) contentType = "image/jpeg";
      else if (key.endsWith(".png")) contentType = "image/png";
      else if (key.endsWith(".json")) contentType = "application/json";
    }
    return { data, contentType };
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err?.code === "ENOENT") {
      return null;
    }
    throw new StorageOperationError(`Failed to get local artifact at key: ${key}`, error);
  }
}

async function deleteLocalArtifact(key: string): Promise<void> {
  const filePath = getLocalFilePath(key);
  const metaPath = `${filePath}.meta.json`;
  await fs.unlink(filePath).catch((err: unknown) => {
    const error = err as { code?: string };
    if (error?.code !== "ENOENT") throw error;
  });
  await fs.unlink(metaPath).catch((err: unknown) => {
    const error = err as { code?: string };
    if (error?.code !== "ENOENT") throw error;
  });
}

async function deleteLocalArtifacts(keys: string[]): Promise<void> {
  await Promise.all(keys.map((key) => deleteLocalArtifact(key)));
}

/**
 * For downstream testing and failure injection (e.g. simulating R2 failures).
 */
export function setStorageFailureInjection(mode: "put" | "get" | "delete" | null) {
  injectedFailureMode = mode;
}

/**
 * Set an in-memory storage map for testing or local simulation.
 */
export function setMockStorage(mock: Map<string, { data: Buffer; contentType: string }> | null) {
  mockStorageMap = mock;
}

export function getMockStorage(): Map<string, { data: Buffer; contentType: string }> | null {
  return mockStorageMap;
}

export function isStorageConfigured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME,
  );
}

function getR2BucketName(): string {
  const bucketName = process.env.R2_BUCKET_NAME;
  if (!bucketName) throw new StorageConfigurationError("R2_BUCKET_NAME is not set");
  return bucketName;
}

export function getR2Client(): S3Client {
  if (s3ClientInstance) return s3ClientInstance;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new StorageConfigurationError();
  }

  const endpoint =
    process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;

  s3ClientInstance = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return s3ClientInstance;
}

/**
 * Store a private artifact in R2 or local disk storage when R2 is unconfigured.
 * Artifact keys are opaque server-side references, never public permissions.
 */
export async function putPrivateArtifact(
  key: string,
  data: Uint8Array | Buffer,
  contentType: string,
): Promise<void> {
  if (injectedFailureMode === "put") {
    throw new StorageOperationError("Injected failure on putPrivateArtifact");
  }

  if (mockStorageMap) {
    mockStorageMap.set(key, { data: Buffer.from(data), contentType });
    return;
  }

  if (!isStorageConfigured()) {
    try {
      await putLocalArtifact(key, data, contentType);
      return;
    } catch (error) {
      throw new StorageOperationError(`Failed to put local artifact at key: ${key}`, error);
    }
  }

  const client = getR2Client();
  const bucket = getR2BucketName();

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      }),
    );
  } catch (error) {
    if (error instanceof StorageConfigurationError) throw error;
    throw new StorageOperationError(`Failed to put artifact at key: ${key}`, error);
  }
}

/**
 * Retrieve a private artifact from R2 or local disk storage when R2 is unconfigured.
 */
export async function getPrivateArtifact(
  key: string,
): Promise<{ data: Buffer; contentType: string } | null> {
  if (injectedFailureMode === "get") {
    throw new StorageOperationError("Injected failure on getPrivateArtifact");
  }

  if (mockStorageMap) {
    const item = mockStorageMap.get(key);
    return item ? { data: Buffer.from(item.data), contentType: item.contentType } : null;
  }

  if (!isStorageConfigured()) {
    return await getLocalArtifact(key);
  }

  const client = getR2Client();
  const bucket = getR2BucketName();

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );

    if (!response.Body) return null;

    const byteArray = await response.Body.transformToByteArray();
    return {
      data: Buffer.from(byteArray),
      contentType: response.ContentType || "application/octet-stream",
    };
  } catch (error: unknown) {
    const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (err?.name === "NoSuchKey" || err?.$metadata?.httpStatusCode === 404) {
      return null;
    }
    if (error instanceof StorageConfigurationError) throw error;
    throw new StorageOperationError(`Failed to get artifact at key: ${key}`, error);
  }
}

/**
 * Delete a private artifact from R2 or local disk storage (best-effort / transactional compensation).
 */
export async function deletePrivateArtifact(key: string): Promise<void> {
  if (injectedFailureMode === "delete") {
    throw new StorageOperationError("Injected failure on deletePrivateArtifact");
  }

  if (mockStorageMap) {
    mockStorageMap.delete(key);
    return;
  }

  if (!isStorageConfigured()) {
    try {
      await deleteLocalArtifact(key);
      return;
    } catch (error) {
      throw new StorageOperationError(`Failed to delete local artifact at key: ${key}`, error);
    }
  }

  const client = getR2Client();
  const bucket = getR2BucketName();

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
  } catch (error) {
    if (error instanceof StorageConfigurationError) throw error;
    throw new StorageOperationError(`Failed to delete artifact at key: ${key}`, error);
  }
}

/**
 * Delete multiple private artifacts from R2 or local disk storage.
 */
export async function deletePrivateArtifacts(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  if (injectedFailureMode === "delete") {
    throw new StorageOperationError("Injected failure on deletePrivateArtifacts");
  }

  if (mockStorageMap) {
    for (const key of keys) {
      mockStorageMap.delete(key);
    }
    return;
  }

  if (!isStorageConfigured()) {
    try {
      await deleteLocalArtifacts(keys);
      return;
    } catch (error) {
      throw new StorageOperationError("Failed to delete local artifacts", error);
    }
  }

  const client = getR2Client();
  const bucket = getR2BucketName();

  try {
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: keys.map((Key) => ({ Key })),
          Quiet: true,
        },
      }),
    );
  } catch (error) {
    if (error instanceof StorageConfigurationError) throw error;
    throw new StorageOperationError("Failed to delete artifacts", error);
  }
}
