/**
 * Nemotron 3 Nano Omni 30B A3B — integration test suite.
 *
 * Tests:
 *  1. Text-only (instruct mode)          → baseline
 *  2. Text-only (thinking mode)          → reasoning trace format
 *  3. Image input (base64 PNG)           → multimodal path for slides
 *  4. Structured output (JSON prompt)    → schema compatibility
 *  5. Rate limit / error shape
 *  6. Response schema explorer
 *
 * Usage:
 *   set NVIDIA_NIM_KEY=<your-key>
 *   npx tsx scripts/test-nemotron-omni.ts
 *
 * Or with a real slide:
 *   npx tsx scripts/test-nemotron-omni.ts --image path/to/slide.png
 *
 * No dependencies — uses Node 22 global fetch().
 */

import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

// ── Config ──

const API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
const MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning"
const API_KEY = process.env.NVIDIA_NIM_KEY

const PASS = "\x1b[32m✓ PASS\x1b[0m"
const FAIL = "\x1b[31m✗ FAIL\x1b[0m"
const SEP = "\n" + "-".repeat(72) + "\n"

// ── Helpers ──

function assert(condition: boolean, label: string) {
  console.log(`  ${condition ? PASS : FAIL}  ${label}`)
}

function hr(msg: string) {
  console.log(SEP, msg, "\n")
}

interface NemotronResponse {
  id?: string
  object?: string
  model?: string
  created?: number
  system_fingerprint?: string
  choices?: { message?: { content?: string; reasoning_content?: string }; finish_reason?: string }[]
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number; completion_tokens_details?: unknown }
}

async function callNim(payload: Record<string, unknown>, timeoutMs = 120_000): Promise<NemotronResponse> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    // Try JSON first; fall back to text for HTML error pages (e.g. 404)
    const contentType = response.headers.get("content-type") || ""
    let data: unknown
    if (contentType.includes("application/json")) {
      data = await response.json()
    } else {
      data = { raw: (await response.text()).slice(0, 500) }
    }

    if (!response.ok) {
      throw Object.assign(new Error(`HTTP ${response.status}`), {
        status: response.status,
        data,
      })
    }
    return data as NemotronResponse
  } finally {
    clearTimeout(timer)
  }
}

function imageToBase64(filePath: string): { mimeType: string; data: string } {
  const ext = filePath.split(".").pop()?.toLowerCase() || "png"
  const mimeMap: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    bmp: "image/bmp",
  }
  const mimeType = mimeMap[ext] || "image/png"
  const buffer = readFileSync(resolve(filePath))
  return { mimeType, data: buffer.toString("base64") }
}

// ── Tests ──

async function test1_textInstruct() {
  hr("TEST 1: Text-only — Instruct mode (no thinking)")

  const result = await callNim({
    model: MODEL,
    messages: [
      {
        role: "user",
        content:
          "Extract key talking points from this slide title: 'Q3 2026 Revenue Growth — Cloud division up 34%, Enterprise flat, SMB down 12%'",
      },
    ],
    max_tokens: 1024,
    temperature: 0.2,
    top_k: 1,
    chat_template_kwargs: { enable_thinking: false },
  })

  const msg = result.choices?.[0]?.message
  console.log("  Response:", JSON.stringify(msg?.content).slice(0, 250))

  assert(!!msg?.content, "has content")
  assert(!msg?.content?.includes("</think>"), "no reasoning trace (instruct mode)")
  assert((result.usage?.completion_tokens ?? 0) > 0, "usage.completion_tokens > 0")
  assert((result.usage?.prompt_tokens ?? 0) > 0, "usage.prompt_tokens > 0")
  assert(result.object === "chat.completion", "object is chat.completion")
  assert(result.model?.includes("nemotron") ?? false, "model name present")

  console.log("  Usage:", JSON.stringify(result.usage))
  return result
}

async function test2_textThinking() {
  hr("TEST 2: Text-only — Thinking mode (with reasoning)")

  const result = await callNim({
    model: MODEL,
    messages: [
      {
        role: "user",
        content:
          "A slide shows: 'Active users Jan: 12K, Feb: 15K, Mar: 22K, Apr: 19K, May: 28K'. What is the month-over-month growth trend? Identify any anomaly.",
      },
    ],
    max_tokens: 4096,
    reasoning_budget: 2048,
    temperature: 0.6,
    top_p: 0.95,
  })

  const msg = result.choices?.[0]?.message
  console.log("  Response preview:", JSON.stringify(msg?.content).slice(0, 350))

  assert(!!msg?.content, "has content")
  assert(
    msg?.content?.includes("</think>") || (result.usage?.completion_tokens ?? 0) > 200,
    "reasoning trace present or substantial output",
  )

  console.log("  Usage:", JSON.stringify(result.usage))
  return result
}

async function test3_imageInput(imagePath?: string) {
  hr("TEST 3: Image input (base64) — Multimodal slide parsing")

  // Use a 1×1 transparent PNG as a minimal valid image if none provided
  const img =
    imagePath && existsSync(imagePath)
      ? imageToBase64(imagePath)
      : {
          mimeType: "image/png",
          data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        }

  console.log(`  Image: ${imagePath || "(1×1 transparent PNG placeholder)"}`)
  console.log(`  MIME:  ${img.mimeType}`)
  console.log(`  Size:  ~${Math.round(img.data.length * 0.75)} bytes`)

  const result = await callNim({
    model: MODEL,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Read all visible text from this slide image. List each text element with its approximate position (top, left, center, bottom). If there are bullet points, numbers, or table cells, include them.",
          },
          { type: "image_url", image_url: { url: `data:${img.mimeType};base64,${img.data}` } },
        ],
      },
    ],
    max_tokens: 4096,
    temperature: 0.2,
    top_k: 1,
    chat_template_kwargs: { enable_thinking: false },
  })

  const msg = result.choices?.[0]?.message
  console.log("  Response:", JSON.stringify(msg?.content).slice(0, 450))

  assert(!!msg?.content, "has content")
  assert((result.usage?.completion_tokens ?? 0) > 0, "usage reported")

  console.log("  Usage:", JSON.stringify(result.usage))
  return result
}

async function test4_structuredOutput() {
  hr("TEST 4: Structured output — JSON extraction from slide text")

  const result = await callNim({
    model: MODEL,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract structured data from this slide text. Return ONLY valid JSON with keys: title, bulletPoints (array), hasChart (boolean), chartType (string or null), tableData (array of rows or null).

Slide content:
"Market Analysis — Q3 2026
• North America revenue: $4.2M (+18% YoY)
• EMEA revenue: $2.8M (+12% YoY)
• APAC revenue: $1.1M (+34% YoY)
• Total: $8.1M (+17% YoY)

Bar chart showing regional breakdown by quarter"`,
          },
        ],
      },
    ],
    max_tokens: 2048,
    temperature: 0.2,
    top_k: 1,
    chat_template_kwargs: { enable_thinking: false },
  })

  const msg = result.choices?.[0]?.message
  const content = msg?.content || ""

  assert(!!content, "has content")

  // Try to parse JSON from the response
  const jsonMatch =
    content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || content.match(/\{[\s\S]*"title"[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0])
      assert(!!parsed.title, "parsed JSON has title")
      assert(Array.isArray(parsed.bulletPoints), "parsed JSON has bulletPoints array")
      console.log("  Parsed JSON:", JSON.stringify(parsed, null, 2))
    } catch {
      console.log("  Raw (JSON parse failed):", content.slice(0, 300))
      assert(false, "response contains valid JSON")
    }
  } else {
    console.log("  Raw (no JSON block detected):", content.slice(0, 300))
    assert(false, "response contains JSON block")
  }

  return result
}

async function test5_errorShapes() {
  hr("TEST 5: Error shapes — missing key, bad model, invalid image")

  // 5a: Missing / bad API key
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: "Bearer invalid",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: "hello" }] }),
      signal: AbortSignal.timeout(10_000),
    })
    const data = await res.json()
    if (res.ok) assert(false, "bad key should fail")
    else {
      assert(res.status === 401 || res.status === 403, `bad key returns ${res.status} (expected 401/403)`)
      console.log(`  Bad key error: HTTP ${res.status}`, JSON.stringify(data).slice(0, 200))
    }
  } catch (err: any) {
    if (err.name === "TimeoutError") assert(false, "bad key request timed out")
    else throw err
  }

  // 5b: Invalid model name
  try {
    await callNim(
      { model: "nvidia/nonexistent-model", messages: [{ role: "user", content: "hello" }], max_tokens: 100 },
      10_000,
    )
    assert(false, "bad model should fail")
  } catch (err: any) {
    const status = err.status ?? err.response?.status
    const bodyText = err.data ? JSON.stringify(err.data).slice(0, 200)
      : err.response?.data ? JSON.stringify(err.response.data).slice(0, 200)
      : err.message ?? String(err)
    console.log(`  Bad model error: HTTP ${status}`, bodyText)
    assert(status != null, "bad model returns error status")
  }

  // 5c: Invalid base64 image
  try {
    await callNim(
      {
        model: MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "describe" },
              { type: "image_url", image_url: { url: "data:image/png;base64,NOTVALID" } },
            ],
          },
        ],
        max_tokens: 100,
      },
      10_000,
    )
    assert(false, "invalid image should fail")
  } catch (err: any) {
    const status = err.status ?? err.response?.status
    const bodyText = err.data ? JSON.stringify(err.data).slice(0, 300)
      : err.response?.data ? JSON.stringify(err.response.data).slice(0, 300)
      : err.message ?? String(err)
    console.log(`  Invalid image error: HTTP ${status}`, bodyText)
    // NVIDIA API returns 500 for malformed images (server-side decode failure)
    assert(status === 400 || status === 422 || status === 500,
      `invalid image returns ${status} (expected 400/422/500)`)
  }
}

// ── Response schema explorer ──

async function exploreSchema() {
  hr("SCHEMA EXPLORATION: Full response shape from a simple query")

  const result = await callNim({
    model: MODEL,
    messages: [{ role: "user", content: "Hello world" }],
    max_tokens: 64,
    temperature: 0.2,
    top_k: 1,
    chat_template_kwargs: { enable_thinking: false },
  })

  console.log("  Top-level keys:", Object.keys(result))
  console.log("  id:", result.id)
  console.log("  object:", result.object)
  console.log("  created:", result.created)
  console.log("  model:", result.model)
  console.log("  choices[0] keys:", Object.keys(result.choices?.[0] || {}))
  console.log("  message keys:", Object.keys(result.choices?.[0]?.message || {}))
  console.log("  usage:", JSON.stringify(result.usage, null, 2))

  if (result.choices?.[0]?.finish_reason) {
    console.log("  finish_reason:", result.choices[0].finish_reason)
  }
  if (result.system_fingerprint) {
    console.log("  system_fingerprint:", result.system_fingerprint)
  }
  if (result.usage?.completion_tokens_details) {
    console.log("  completion_tokens_details:", JSON.stringify(result.usage.completion_tokens_details, null, 2))
  }
}

// ── Main ──

async function main() {
  if (!API_KEY) {
    console.error("\n  ❌  Set NVIDIA_NIM_KEY environment variable\n")
    process.exit(1)
  }

  const imageArg = process.argv.find((a) => a.startsWith("--image="))
  const imagePath = imageArg?.split("=")[1]

  console.log(`\n  Model: ${MODEL}`)
  console.log(`  API:   ${API_URL}`)
  console.log(`  Key:   ${API_KEY.slice(0, 8)}...${API_KEY.slice(-4)}`)
  console.log(SEP)

  const results: { name: string; pass: boolean }[] = []

  for (const [name, fn] of Object.entries({
    "Text instruct mode": test1_textInstruct,
    "Text thinking mode": test2_textThinking,
    "Image input": () => test3_imageInput(imagePath),
    "Structured JSON output": test4_structuredOutput,
    "Error shapes": test5_errorShapes,
    "Response schema": exploreSchema,
  })) {
    try {
      await fn()
      results.push({ name, pass: true })
    } catch (err: any) {
      console.error(`\n  ${FAIL}  ${name} threw: ${err.message}`)
      if (err.data) console.error("     Body:", JSON.stringify(err.data).slice(0, 300))
      results.push({ name, pass: false })
    }
  }

  // Summary
  console.log(SEP)
  console.log("  RESULTS")
  console.log(SEP)
  for (const r of results) {
    console.log(`  ${r.pass ? PASS : FAIL}  ${r.name}`)
  }
  const passed = results.filter((r) => r.pass).length
  console.log(`\n  ${passed}/${results.length} tests passed`)
}

main()
