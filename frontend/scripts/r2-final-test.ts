/**
 * Final R2 connection test with the CORRECT account ID.
 * Run: npx tsx --env-file=.env.local scripts/r2-final-test.ts
 */
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3"

async function main() {
  const accountId = process.env.R2_ACCOUNT_ID!
  const accessKey = process.env.R2_ACCESS_KEY_ID!
  const secretKey = process.env.R2_SECRET_ACCESS_KEY!
  const bucket = process.env.R2_BUCKET_NAME!

  console.log(`Account ID: ${accountId}`)
  console.log(`Bucket: ${bucket}`)
  console.log(`Endpoint: https://${accountId}.r2.cloudflarestorage.com\n`)

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    forcePathStyle: true,
  })

  console.log("Listing R2 bucket contents...")
  try {
    const result = await s3.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 10 }))
    console.log(`✅ Connection successful!`)
    console.log(`Objects in bucket: ${result.KeyCount ?? 0}`)
    for (const obj of result.Contents ?? []) {
      console.log(`  ${obj.Key}  (${((obj.Size ?? 0) / 1024).toFixed(1)} KB)`)
    }
  } catch (err: any) {
    console.log(`❌ Error: ${err.message?.slice(0, 200)}`)
    if (err.code) console.log(`Code: ${err.code}`)
  } finally {
    s3.destroy()
  }
}

main()
