# R2 SSL Handshake Failure — Diagnosis

**Date:** 2026-07-02
**Environment:** Node.js 22 (Windows dev), Vercel Serverless (production)
**Storage target:** Cloudflare R2 (`https://529b6166b86e90326e0c098738df70da.r2.cloudflarestorage.com`)
**SDK:** `@aws-sdk/client-s3` v3

## Error

```
Error: write EPROTO E8690000:error:0A000410:SSL routines:ssl3_read_bytes:ssl/tls alert handshake failure
    at c:\ws\deps\openssl\openssl\ssl\record\rec_layer_s3.c:916:SSL alert number 40
  errno: -4046,
  code: 'EPROTO',
  syscall: 'write',
  '$metadata': { attempts: 1, totalRetryDelay: 0 }
```

- **`SSL alert number 40`** = `SSL_AD_HANDSHAKE_FAILURE` — server rejected the TLS handshake
- **`EPROTO`** = Protocol error — the TLS layer couldn't establish a connection
- **`$metadata.attempts: 1`** = Only tried once (with `maxAttempts: 3`, it would retry but fail again)

## What Works

- **`getSignedUrl()`** from `@aws-sdk/s3-request-presigner` — signs requests LOCALLY using the credentials, no network call to R2. This works perfectly.
- **The same R2 endpoint accessed from the browser** (via presigned URLs) — browser TLS handles Cloudflare R2 fine. CORS policy must be configured on the R2 bucket.
- **Supabase Storage S3 API** — no TLS issues. Works reliably in the same environment.

## What Fails

Any `S3Client.send(cmd)` that makes an actual HTTPS request to the R2 endpoint:
- `ListObjectsV2Command` — listing files
- `PutObjectCommand` — uploading files
- `GetObjectCommand` — downloading files (not presigned, direct)
- `DeleteObjectCommand` — deleting files

These all fail with the same SSL handshake error.

## What We've Tried

| Approach | Configuration | Result |
|----------|--------------|--------|
| Default SDK handler | No explicit `requestHandler` | ❌ SSL handshake failure |
| `FetchHttpHandler` | `new FetchHttpHandler({ requestTimeout: 60000 })` | ❌ TypeScript error on `connectionTimeout`, same SSL failure |
| `NodeHttpHandler` | `new NodeHttpHandler({ connectionTimeout: 15000, socketTimeout: 120000 })` | ❌ SSL handshake failure |
| `NodeHttpHandler` + custom `https.Agent` | `new HttpsAgent({ minVersion: "TLSv1.2" })` | ❌ SSL handshake failure |
| `NodeHttpHandler` + insecure agent | `new HttpsAgent({ rejectUnauthorized: false, minVersion: "TLSv1.2" })` | ❌ SSL handshake failure |
| `forcePathStyle: true` | `new S3Client({ ..., forcePathStyle: true })` | ❌ Still fails |
| `maxAttempts: 3` | `new S3Client({ ..., maxAttempts: 3 })` | ❌ All 3 attempts fail with same error |

## Network Details

- **R2 Endpoint:** `https://529b6166b86e90326e0c098738df70da.r2.cloudflarestorage.com`
- **Bucket:** `moduvox-audio`
- **Region:** `auto`
- **Credentials:** S3-compatible API token (Access Key + Secret Key) with Object Read & Write permissions
- **Node.js version (local):** 22.20.0
- **Node.js version (Vercel):** 18.x (default) or 20.x
- **OpenSSL path in error:** `c:\ws\deps\openssl\openssl\ssl\record\rec_layer_s3.c:916` — this is the OpenSSL bundled with Node.js

## Key Observations

1. **Not a credentials issue** — `getSignedUrl()` uses the same credentials and works fine (it signs locally without a network call). If credentials were wrong, the presigned URLs would be invalid, but browser uploads using them work.

2. **Not a firewall/network block** — The same R2 endpoint is accessible from the browser. The Node.js runtime can reach the server but fails at the TLS negotiation stage.

3. **OpenSSL version-specific** — The error originates from OpenSSL's `ssl3_read_bytes`. Different Node.js versions bundle different OpenSSL versions. Node 18 uses OpenSSL 1.1.1, Node 20+ uses OpenSSL 3.x.

4. **Supabase Storage works fine** — Supabase Storage also uses an S3-compatible API behind the scenes, but it goes through `supabase.storage` client which might use a different HTTP stack or endpoint that negotiates TLS successfully.

5. **`NODE_TLS_REJECT_UNAUTHORIZED=0` was NOT tried** — Setting this environment variable would disable certificate validation entirely, but it's insecure and shouldn't be necessary for Cloudflare.

## Suspected Root Cause

**Cipher suite mismatch.** Cloudflare R2 requires specific TLS 1.2/1.3 cipher suites. The Node.js OpenSSL default cipher list might not include ciphers that overlap with what Cloudflare R2's edge offers.

Cloudflare R2's supported ciphers for TLS 1.2 include:
- `ECDHE-ECDSA-AES128-GCM-SHA256`
- `ECDHE-RSA-AES128-GCM-SHA256`
- `ECDHE-ECDSA-AES256-GCM-SHA384`
- `ECDHE-RSA-AES256-GCM-SHA384`
- `ECDHE-ECDSA-CHACHA20-POLY1305`
- `ECDHE-RSA-CHACHA20-POLY1305`

If the Node.js default cipher list doesn't prioritize these, or if it's using an outdated cipher list, the handshake fails.

## Next Steps to Investigate

1. **Check Node.js OpenSSL version:**
   ```
   node -e "console.log(process.versions.openssl)"
   ```
   Different versions support different cipher suites.

2. **Test with explicit cipher list:**
   Set `NODE_OPTIONS=--tls-cipher-list="ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305"`

3. **Test raw HTTPS without AWS SDK:**
   Use Node's `https` module directly to connect to the R2 endpoint and see if a raw GET works:
   ```typescript
   import https from "https"
   const req = https.get("https://...r2.cloudflarestorage.com/moduvox-audio", (res) => {
     console.log("Status:", res.statusCode)
   })
   req.on("error", (e) => console.error("HTTPS error:", e.message))
   ```

4. **Test with `--tls-min-v1.0`:**
   Set `NODE_OPTIONS=--tls-min-v1.0` to allow a wider range of TLS versions.

5. **Test with different Node.js runtime:**
   Vercel supports Node 18 and 20. If you're on Node 18 (OpenSSL 1.1.1), try Node 20 (OpenSSL 3.x) or vice versa.

6. **Try `undici` directly:**
   The `@smithy/fetch-http-handler` uses the global `fetch` which uses `undici` on Node 18+. `undici` has its own TLS implementation that might handle R2 differently.

7. **Try a raw S3 presigned URL via `https` module:**
   Generate a presigned URL with `getSignedUrl`, then access it with Node's `https` module. If this works, the issue is specifically with the AWS SDK's HTTP handler, not the TLS stack:
   ```typescript
   const url = await createSignedUrl("test.txt")
   const res = await fetch(url)
   ```

8. **Consider Cloudflare's recommended `connectUri` override:**
   Cloudflare R2 has specific requirements for how the Host header and SNI are set. The AWS SDK might be sending an incorrect SNI that doesn't match what Cloudflare expects.
