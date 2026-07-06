/**
 * Quick test: Does the custom SNI agent allow R2 access?
 * Run: npx tsx --env-file=.env.local scripts/r2-fix-verify.ts
 */
import https from "https"
import tls from "tls"
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3"
import { NodeHttpHandler } from "@smithy/node-http-handler"

const accountId = process.env.R2_ACCOUNT_ID!
const accessKey = process.env.R2_ACCESS_KEY_ID!
const secretKey = process.env.R2_SECRET_ACCESS_KEY!
const bucket = process.env.R2_BUCKET_NAME!

// Custom agent that sets SNI to base domain
const agent = new https.Agent({ keepAlive: true, maxSockets: 50 })
const origCreate = agent.createConnection.bind(agent)
agent.createConnection = (options: tls.ConnectionOptions, cb?: Function) => {
  return origCreate({ ...options, servername: "r2.cloudflarestorage.com" }, cb as any)
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  forcePathStyle: true,
  maxAttempts: 1,
  requestHandler: new NodeHttpHandler({
    httpsAgent: agent,
    requestTimeout: 15000,
    connectionTimeout: 10000,
  }),
})

async function main() {
  console.log("Testing R2 connection with custom SNI agent...")
  try {
    const result = await s3.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 3 }))
    console.log(`✅ R2 accessible!`)
    console.log(`  Objects: ${result.KeyCount ?? 0}`)
    if (result.Contents) {
      for (const obj of result.Contents) {
        console.log(`  ${obj.Key} (${((obj.Size ?? 0) / 1024).toFixed(1)} KB)`)
      }
    }
  } catch (err: any) {
    console.log(`❌ Failed: ${err.message.slice(0, 200)}`)
    if (err.$metadata) console.log(`  Status: ${err.$metadata.httpStatusCode}`)
    if (err.code) console.log(`  Code: ${err.code}`)
  } finally {
    s3.destroy()
  }
}

main()
