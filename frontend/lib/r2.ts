import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

let client: S3Client | null = null

function getClient(): S3Client {
  if (!client) {
    const accountId = process.env.R2_ACCOUNT_ID || "529b6166b86e90326e0c098738df70da"
    client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    })
  }
  return client
}

const BUCKET = process.env.R2_BUCKET_NAME || "moduvox-audio"

export async function fileExists(key: string): Promise<boolean> {
  try {
    const cmd = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: key,
      MaxKeys: 1,
    })
    const result = await getClient().send(cmd)
    return (result.Contents || []).some((obj) => obj.Key === key)
  } catch {
    return false
  }
}

export async function uploadFile(key: string, data: Buffer, contentType: string): Promise<void> {
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: data,
    ContentType: contentType,
  })
  await getClient().send(cmd)
}

export async function downloadFile(key: string): Promise<Buffer | null> {
  try {
    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key })
    const result = await getClient().send(cmd)
    if (!result.Body) return null
    return Buffer.from(await result.Body.transformToByteArray())
  } catch {
    return null
  }
}

export async function listFiles(prefix: string): Promise<{ name: string }[]> {
  const cmd = new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: prefix,
  })
  const result = await getClient().send(cmd)
  return (result.Contents || []).map((obj) => ({ name: obj.Key || "" })).filter((f) => f.name)
}

export async function createSignedUrl(key: string, expiresInSeconds = 86400): Promise<string | null> {
  try {
    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key })
    return await getSignedUrl(getClient(), cmd, { expiresIn: expiresInSeconds })
  } catch {
    return null
  }
}

export async function createUploadUrl(key: string, contentType: string, expiresInSeconds = 3600): Promise<string | null> {
  try {
    const cmd = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    })
    return await getSignedUrl(getClient(), cmd, { expiresIn: expiresInSeconds })
  } catch {
    return null
  }
}

export async function removeFile(key: string): Promise<void> {
  try {
    const cmd = new DeleteObjectCommand({ Bucket: BUCKET, Key: key })
    await getClient().send(cmd)
  } catch {
    // Non-critical
  }
}
