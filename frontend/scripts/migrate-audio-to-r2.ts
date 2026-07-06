/**
 * ONE-TIME migration script: copy existing combined.wav files from
 * Supabase Storage to Cloudflare R2.
 *
 * Only needed if you have existing data in Supabase Storage.
 * After migration, all new files go directly to R2.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/migrate-audio-to-r2.ts
 */

import { createClient } from "@supabase/supabase-js"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import * as fs from "fs"
import * as path from "path"

// Load .env.local manually
const envPath = path.resolve(__dirname, "../.env.local")
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith("#")) {
      const eqIdx = trimmed.indexOf("=")
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim()
        const val = trimmed.slice(eqIdx + 1).trim()
        if (!process.env[key]) process.env[key] = val
      }
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY_ID!
const R2_SECRET = process.env.R2_SECRET_ACCESS_KEY!
const R2_BUCKET = process.env.R2_BUCKET_NAME || "moduvox-audio"

async function main() {
  console.log("=== Migrating combined.wav from Supabase Storage to R2 ===\n")

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET },
  })

  // Get all presentations with user_ids
  const { data: presentations, error } = await supabase
    .from("presentations")
    .select("id, user_id")

  if (error) {
    console.error("Failed to fetch presentations:", error.message)
    process.exit(1)
  }

  console.log(`Found ${presentations.length} presentations\n`)

  let migrated = 0
  let skipped = 0
  let failed = 0

  for (const p of presentations) {
    const key = `${p.user_id}/audio/${p.id}/combined.wav`

    // Download from Supabase Storage
    const { data: fileData, error: dlError } = await supabase.storage
      .from("presentation-files")
      .download(key)

    if (dlError || !fileData) {
      skipped++
      continue
    }

    const buffer = Buffer.from(await fileData.arrayBuffer())

    // Upload to R2
    try {
      await r2.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: "audio/wav",
        }),
      )
      console.log(
        `  ✓ Migrated:  ${p.id.slice(0, 8)}... (${(buffer.length / 1024 / 1024).toFixed(1)}MB)`,
      )
      migrated++
    } catch (err: any) {
      console.error(`  ✗ Failed:    ${p.id.slice(0, 8)}... — ${err.message}`)
      failed++
    }
  }

  console.log(
    `\n=== Complete: ${migrated} migrated, ${skipped} skipped (no combined.wav), ${failed} failed ===`,
  )
}

main().catch(console.error)
