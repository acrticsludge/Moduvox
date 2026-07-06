/**
 * Cloudflare R2 utilities — full S3-compatible operations.
 *
 * Presigned URLs (createSignedUrl, createDownloadUrl) sign requests LOCALLY
 * and always work. Direct S3 API calls (upload, download, delete, list) require
 * the R2 account subdomain to be TLS-active on Cloudflare's edge. If the
 * subdomain is not yet active, these calls will fail with an SSL handshake error.
 *
 * To enable R2 for this account:
 *   1. Go to Cloudflare Dashboard → R2 → verify R2 is enabled
 *   2. Verify API token has "Object Read & Write" permissions
 *   3. Verify the bucket exists and is Active
 *
 * @see docs/r2-ssl-handshake-diagnosis.md
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  type _Object,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import type { Readable } from "stream"

// ── Configuration ──────────────────────────────────────────

function getConfig() {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucket = process.env.R2_BUCKET_NAME

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      "Missing R2 configuration. Required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME"
    )
  }

  return { accountId, accessKeyId, secretAccessKey, bucket }
}

function createR2Client() {
  const { accountId, accessKeyId, secretAccessKey } = getConfig()
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
    maxAttempts: 1,
  })
}

// Lazy getter — avoids crash at import time before env vars are loaded (e.g., during Next.js build)
function bucketName(): string {
  return getConfig().bucket
}

// ── Result Types ───────────────────────────────────────────

export interface R2Result<T> {
  success: true
  data: T
}

export interface R2Error {
  success: false
  error: string
  code?: string
  isTlsError?: boolean
}

export type R2Response<T> = R2Result<T> | R2Error

// ── Log the resolved request URL (Fix 2) ───────────────────

function logEndpoint() {
  const { accountId } = getConfig()
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`
  console.log(`[R2] Endpoint: ${endpoint} | Bucket: ${bucketName()} | Path-style: true`)
}

// ── Helpers ────────────────────────────────────────────────

function isTlsHandshakeError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const msg = err.message
  return (
    msg.includes("ssl/tls alert handshake failure") ||
    msg.includes("EPROTO") ||
    msg.includes("ERR_SSL") ||
    msg.includes("CERT_HAS_EXPIRED") ||
    msg.includes("UNABLE_TO_VERIFY_LEAF_SIGNATURE") ||
    msg.includes("DEPTH_ZERO_SELF_SIGNED_CERT")
  )
}

function handleAwsError(err: unknown): R2Error {
  if (err instanceof Error) {
    const msg = err.message
    const code = (err as any).code as string | undefined
    const tls = isTlsHandshakeError(err)

    if (tls) {
      console.error(
        "[R2] TLS handshake failure — R2 account subdomain may not be active on Cloudflare edge. " +
        "Verify R2 is enabled in Cloudflare Dashboard. See docs/r2-ssl-handshake-diagnosis.md"
      )
    } else {
      console.error(`[R2] Operation failed:`, msg)
    }

    return { success: false, error: msg, code, isTlsError: tls }
  }
  return { success: false, error: String(err) }
}

// ── Direct S3 Operations ───────────────────────────────────

/**
 * Upload a file to R2.
 * Uses s3.send(PutObjectCommand) directly.
 */
export async function uploadFile(
  key: string,
  body: Buffer | Readable | Blob | string,
  contentType: string
): Promise<R2Response<{ key: string; etag?: string }>> {
  const client = createR2Client()
  try {
    const cmd = new PutObjectCommand({
      Bucket: bucketName(),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
    const result = await client.send(cmd)
    console.log(`[R2] Uploaded: ${key} (ETag: ${result.ETag})`)
    return { success: true, data: { key, etag: result.ETag } }
  } catch (err) {
    return handleAwsError(err)
  } finally {
    client.destroy()
  }
}

/**
 * Download a file from R2.
 * Returns the response body as a Readable stream.
 */
export async function downloadFile(key: string): Promise<R2Response<{ body: Readable; contentType?: string; contentLength?: number }>> {
  const client = createR2Client()
  try {
    const cmd = new GetObjectCommand({ Bucket: bucketName(), Key: key })
    const result = await client.send(cmd)
    console.log(`[R2] Downloaded: ${key} (${result.ContentLength ?? "?"} bytes)`)
    return {
      success: true,
      data: {
        body: result.Body as Readable,
        contentType: result.ContentType,
        contentLength: result.ContentLength,
      },
    }
  } catch (err) {
    return handleAwsError(err)
  } finally {
    client.destroy()
  }
}

/**
 * Delete a file from R2.
 */
export async function deleteFile(key: string): Promise<R2Response<{ key: string }>> {
  const client = createR2Client()
  try {
    const cmd = new DeleteObjectCommand({ Bucket: bucketName(), Key: key })
    await client.send(cmd)
    console.log(`[R2] Deleted: ${key}`)
    return { success: true, data: { key } }
  } catch (err) {
    return handleAwsError(err)
  } finally {
    client.destroy()
  }
}

/**
 * List files in the R2 bucket, optionally filtered by prefix.
 */
export async function listFiles(prefix?: string): Promise<R2Response<_Object[]>> {
  const client = createR2Client()
  try {
    const cmd = new ListObjectsV2Command({
      Bucket: bucketName(),
      Prefix: prefix,
    })
    const result = await client.send(cmd)
    console.log(`[R2] Listed: ${result.KeyCount ?? 0} objects (prefix: ${prefix ?? "none"})`)
    return { success: true, data: result.Contents ?? [] }
  } catch (err) {
    return handleAwsError(err)
  } finally {
    client.destroy()
  }
}

/**
 * Check if a file exists in R2.
 */
export async function fileExists(key: string): Promise<R2Response<boolean>> {
  const client = createR2Client()
  try {
    const cmd = new HeadObjectCommand({ Bucket: bucketName(), Key: key })
    await client.send(cmd)
    return { success: true, data: true }
  } catch (err: any) {
    if (err?.$metadata?.httpStatusCode === 404) {
      return { success: true, data: false }
    }
    return handleAwsError(err)
  } finally {
    client.destroy()
  }
}

// ── Stream-to-Buffer Helper ────────────────────────────────

async function readableToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

/**
 * Download a file from R2 and return it as a Buffer.
 * Convenience wrapper around downloadFile for consumers that need
 * random access (e.g., WAV duration parsing, range requests).
 */
export async function downloadFileAsBuffer(key: string): Promise<R2Response<Buffer>> {
  const result = await downloadFile(key)
  if (!result.success) return result
  try {
    const buffer = await readableToBuffer(result.data.body)
    return { success: true, data: buffer }
  } catch (err) {
    return handleAwsError(err)
  }
}

// ── Presigned URLs (always work — local signing, no network) ──

/**
 * Generate a signed GET URL for direct browser download from R2.
 * This signs the request LOCALLY — no network call to R2.
 * Zero egress fees for viewer-facing audio/video delivery.
 */
export async function createDownloadUrl(key: string, expiresInSeconds = 86400): Promise<string | null> {
  const client = createR2Client()
  try {
    const cmd = new GetObjectCommand({ Bucket: bucketName(), Key: key })
    return await getSignedUrl(client, cmd, { expiresIn: expiresInSeconds })
  } catch (err) {
    console.error("[R2] createDownloadUrl failed:", err)
    return null
  } finally {
    client.destroy()
  }
}

/**
 * Generate a signed PUT URL for direct browser upload to R2.
 * No network call — signs locally.
 */
export async function createUploadUrl(
  key: string,
  contentType?: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const client = createR2Client()
  try {
    const cmd = new PutObjectCommand({
      Bucket: bucketName(),
      Key: key,
      ContentType: contentType,
    })
    return await getSignedUrl(client, cmd, { expiresIn: expiresInSeconds })
  } catch (err) {
    console.error("[R2] createUploadUrl failed:", err)
    return null
  } finally {
    client.destroy()
  }
}

/**
 * @deprecated Use createDownloadUrl instead.
 * Generate a signed GET URL for direct browser access via R2 CDN.
 */
export async function createSignedUrl(key: string, expiresInSeconds = 86400): Promise<string | null> {
  return createDownloadUrl(key, expiresInSeconds)
}

// ── Init logging ───────────────────────────────────────────

logEndpoint()
