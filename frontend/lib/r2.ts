/**
 * Cloudflare R2 utilities.
 * 
 * IMPORTANT: getSignedUrl signs requests LOCALLY without network calls.
 * Direct S3 API calls (upload, delete, list) are not used from
 * serverless functions due to TLS compatibility issues with some
 * Cloudflare edge nodes. Server-side storage ops use Supabase Storage.
 * 
 * R2 is used ONLY for generating signed URLs (zero egress fees for
 * viewer-facing audio/video delivery).
 */

import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const accountId = process.env.R2_ACCOUNT_ID || "529b6166b86e90326e0c098738df70da"

const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
})

const BUCKET = process.env.R2_BUCKET_NAME || "moduvox-audio"

/**
 * Generate a signed GET URL for direct browser access via R2 CDN.
 * This signs the request LOCALLY — no network call to R2.
 */
export async function createSignedUrl(key: string, expiresInSeconds = 86400): Promise<string | null> {
  try {
    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key })
    return await getSignedUrl(client, cmd, { expiresIn: expiresInSeconds })
  } catch (err) {
    console.error("R2 createSignedUrl failed:", err)
    return null
  }
}

/**
 * Generate a signed PUT URL for direct browser upload to R2.
 * No network call — signs locally.
 */
export async function createUploadUrl(key: string, expiresInSeconds = 3600): Promise<string | null> {
  try {
    const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key })
    return await getSignedUrl(client, cmd, { expiresIn: expiresInSeconds })
  } catch (err) {
    console.error("R2 createUploadUrl failed:", err)
    return null
  }
}
