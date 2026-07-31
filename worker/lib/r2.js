/**
 * R2 S3-compatible client for the worker.
 * Uses @aws-sdk/client-s3 with the Cloudflare R2 endpoint.
 */
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, CopyObjectCommand } from "@aws-sdk/client-s3"

/** @returns {Buffer} */
async function streamToBuffer(/** @type {import('stream').Readable} */ stream) {
  const chunks = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID
const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY
const BUCKET = process.env.R2_BUCKET_NAME

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  },
  requestHandler: undefined, // use default Node.js handler (fetch in Node 18+)
})

/**
 * Download an object from R2 and return its body as a Buffer.
 * @param {string} key
 * @returns {Promise<{ success: boolean; data?: Buffer; error?: string }>}
 */
export async function getObject(key) {
  try {
    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key })
    const response = await s3.send(cmd)
    const body = await streamToBuffer(response.Body)
    return { success: true, data: body }
  } catch (err) {
    console.error(`[r2] getObject("${key}") failed:`, err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Upload a buffer to R2.
 * @param {string} key
 * @param {Buffer} body
 * @param {string} contentType
 * @returns {Promise<{ success: boolean; error?: string }>}
 */
export async function putObject(key, body, contentType) {
  try {
    const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType })
    await s3.send(cmd)
    return { success: true }
  } catch (err) {
    console.error(`[r2] putObject("${key}") failed:`, err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Delete an object from R2.
 * @param {string} key
 * @returns {Promise<{ success: boolean; error?: string }>}
 */
export async function deleteObject(key) {
  try {
    const cmd = new DeleteObjectCommand({ Bucket: BUCKET, Key: key })
    await s3.send(cmd)
    return { success: true }
  } catch (err) {
    console.error(`[r2] deleteObject("${key}") failed:`, err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Copy an object within R2 (used for atomic rename).
 * @param {string} sourceKey — full key path (e.g. "prefix/combined-rebuild.wav")
 * @param {string} destKey — full key path
 * @returns {Promise<{ success: boolean; error?: string }>}
 */
export async function copyObject(sourceKey, destKey) {
  try {
    const cmd = new CopyObjectCommand({
      Bucket: BUCKET,
      CopySource: `${BUCKET}/${sourceKey}`,
      Key: destKey,
    })
    await s3.send(cmd)
    return { success: true }
  } catch (err) {
    console.error(`[r2] copyObject("${sourceKey}" -> "${destKey}") failed:`, err.message)
    return { success: false, error: err.message }
  }
}
