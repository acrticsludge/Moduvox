import express from "express";
import { z } from "zod";
import { PDFDocument } from "pdf-lib";
import { execSync } from "child_process";
import { createWriteStream, existsSync, mkdirSync, rmSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";
import { pipeline } from "stream/promises";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const app = express();
app.use(express.json({ limit: "1mb" }));

// ── Constants ──
const PORT = parseInt(process.env.PORT || "8080", 10);
const API_KEY = process.env.API_KEY;
const CORS_ORIGIN = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const TMP_DIR = "/tmp/convert";

// ── Supabase + Resend clients ──
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const resendApiKey = process.env.RESEND_API_KEY || "";
const resendFrom = process.env.RESEND_FROM_EMAIL || "Moduvox <alerts@pulsemonitor.dev>";

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const resend = resendApiKey ? new Resend(resendApiKey) : null;

// ── Email queue constants ──
const QUEUE_POLL_INTERVAL_MS = parseInt(process.env.QUEUE_POLL_INTERVAL || "10000", 10);
const MAX_RETRIES = 3;

// ── CORS ──
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (
    origin &&
    (CORS_ORIGIN.includes("*") || CORS_ORIGIN.includes(origin))
  ) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ── Request logger ──
app.use((req, res, next) => {
  console.log(`[worker] ${req.method} ${req.path}`);
  next();
});

// ── Auth middleware ──
function auth(req, res, next) {
  console.log(`[worker] Auth check for ${req.method} ${req.path}`);
  if (!API_KEY) {
    console.log("[worker] No API_KEY configured — auth disabled");
    return next();
  }
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  }
  const token = header.slice(7);
  if (token.length !== API_KEY.length) {
    return res.status(401).json({ error: "Invalid API key" });
  }
  let match = 0;
  for (let i = 0; i < token.length; i++) {
    match |= token.charCodeAt(i) ^ API_KEY.charCodeAt(i);
  }
  if (match !== 0) {
    return res.status(401).json({ error: "Invalid API key" });
  }
  next();
}

// ── Zod schemas ──
const ConvertSchema = z.object({
  pptxUrl: z.string().url(),
  slidePutUrls: z.record(z.string(), z.string().url()),
  slideCount: z.number().int().min(1).max(200),
});

// ── Download helper ──
async function downloadFile(url, destPath) {
  const res = await fetch(url, { timeout: 60_000 });
  if (!res.ok)
    throw new Error(`Download failed: HTTP ${res.status}`);
  const fileStream = createWriteStream(destPath);
  await pipeline(res.body, fileStream);
}

// ── Upload helper ──
async function uploadPdf(url, pdfBuffer) {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/pdf" },
    body: pdfBuffer,
    timeout: 60_000,
  });
  if (!res.ok)
    throw new Error(`Upload failed for ${url}: HTTP ${res.status}`);
}

// ── Convert endpoint ──
app.post("/convert", auth, async (req, res) => {
  const parsed = ConvertSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(422)
      .json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
  }

  const { pptxUrl, slidePutUrls, slideCount } = parsed.data;
  const tmpInput = join(TMP_DIR, "input.pptx");
  const tmpOutput = join(TMP_DIR, "input.pdf");

  if (existsSync(TMP_DIR)) rmSync(TMP_DIR, { recursive: true });
  mkdirSync(TMP_DIR, { recursive: true });

  try {
    console.log(`[convert] Downloading PPTX from ${pptxUrl}`);
    await downloadFile(pptxUrl, tmpInput);

    console.log("[convert] Converting PPTX -> PDF via LibreOffice");
    try {
      execSync(
        `soffice --headless --convert-to pdf --outdir ${TMP_DIR} ${tmpInput}`,
        {
          timeout: 180_000,
          stdio: "pipe",
        },
      );
      console.log("[convert] LibreOffice conversion completed");
    } catch (libreErr) {
      console.error("[convert] LibreOffice command failed:", libreErr.stderr?.toString() || libreErr.message);
      throw new Error(`LibreOffice conversion failed: ${libreErr.message}`);
    }

    if (!existsSync(tmpOutput)) {
      console.error(`[convert] Expected output not found at ${tmpOutput}`);
      throw new Error("LibreOffice did not produce output PDF");
    }
    console.log(`[convert] Output PDF exists: ${tmpOutput} (${(await readFile(tmpOutput)).length} bytes)`);

    console.log("[convert] Reading PDF and splitting into pages");
    const sourcePdfBytes = await readFile(tmpOutput);
    const sourcePdf = await PDFDocument.load(sourcePdfBytes);

    const actualPageCount = sourcePdf.getPageCount();
    if (actualPageCount < slideCount) {
      console.warn(
        `[convert] PPTX has ${actualPageCount} pages, expected ${slideCount}`,
      );
    }

    const pagesToProcess = Math.min(actualPageCount, slideCount);
    for (let i = 1; i <= pagesToProcess; i++) {
      const newPdf = await PDFDocument.create();
      const [copiedPage] = await newPdf.copyPages(sourcePdf, [i - 1]);
      newPdf.addPage(copiedPage);
      const pdfBytes = await newPdf.save();

      const putUrl = slidePutUrls[String(i)];
      if (!putUrl) {
        console.warn(`[convert] No PUT URL for slide ${i}, skipping`);
        continue;
      }

      console.log(`[convert] Uploading slide ${i}/${pagesToProcess} PDF`);
      await uploadPdf(putUrl, pdfBytes);
    }

    console.log("[convert] Done");
    res.json({ success: true, slideCount: pagesToProcess });
  } catch (err) {
    console.error("[convert] Error:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    if (existsSync(TMP_DIR)) rmSync(TMP_DIR, { recursive: true });
  }
});

// ── Email Queue: Process one item ──────────────────────────────────────
async function processEmail(item) {
  if (!resend) {
    console.warn("[email-queue] Resend not configured — marking as failed");
    return { success: false, error: "Resend not configured" };
  }

  const { id, to_email, subject, html } = item;

  // Mark as processing
  await supabase
    .from("email_queue")
    .update({ status: "processing" })
    .eq("id", id);

  try {
    const { error } = await resend.emails.send({
      from: resendFrom,
      to: [to_email],
      subject,
      html,
    });

    if (error) {
      throw new Error(error.message);
    }

    // Mark as sent + write to sent_emails audit log
    const now = new Date().toISOString();
    await supabase
      .from("email_queue")
      .update({ status: "sent", processed_at: now })
      .eq("id", id);

    await supabase.from("sent_emails").insert({
      to_email,
      email_type: item.email_type,
      subject,
      status: "sent",
      user_id: item.audit_user_id || null,
    });

    console.log(`[email-queue] Sent: ${item.email_type} -> ${to_email}`);
    return { success: true };
  } catch (err) {
    const errorMessage = err.message || "Unknown error";
    const newRetryCount = (item.retry_count || 0) + 1;
    const failed = newRetryCount >= MAX_RETRIES;

    await supabase
      .from("email_queue")
      .update({
        status: failed ? "failed" : "pending",
        retry_count: newRetryCount,
        error_message: errorMessage,
        processed_at: failed ? new Date().toISOString() : null,
      })
      .eq("id", id);

    if (failed) {
      // Also log to sent_emails as failed for audit trail
      await supabase.from("sent_emails").insert({
        to_email,
        email_type: item.email_type,
        subject,
        status: "failed",
        error_message: errorMessage,
        user_id: item.audit_user_id || null,
      });
    }

    console.log(`[email-queue] ${failed ? "Failed" : `Retry ${newRetryCount}/${MAX_RETRIES}`}: ${item.email_type} -> ${to_email}: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

// ── Email Queue: Poll for pending items ────────────────────────────────
async function pollQueue() {
  if (!supabase || !resend) {
    return; // clients not configured — skip
  }

  try {
    const { data: items, error } = await supabase
      .from("email_queue")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(5);

    if (error) {
      console.error("[email-queue] Poll error:", error.message);
      return;
    }

    if (!items || items.length === 0) return;

    console.log(`[email-queue] Processing ${items.length} pending emails`);
    await Promise.all(items.map((item) => processEmail(item)));
  } catch (err) {
    console.error("[email-queue] Poll error:", err.message);
  }
}

// ── Start polling ──
if (supabase && resend) {
  console.log(`[email-queue] Starting poll loop every ${QUEUE_POLL_INTERVAL_MS}ms`);
  setInterval(pollQueue, QUEUE_POLL_INTERVAL_MS);
  // Also run immediately on startup
  setTimeout(pollQueue, 2000);
} else {
  console.warn("[email-queue] Disabled — SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and RESEND_API_KEY must be set");
}

// ── Manual trigger endpoint (for debugging / external cron) ──
app.post("/queue/process", auth, async (req, res) => {
  await pollQueue();
  res.json({ ok: true });
});

// ── Health check ──
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    emailQueue: supabase && resend ? "active" : "disabled",
  });
});

// ── Start ──
app.listen(PORT, () => {
  console.log(`PPT converter worker listening on port ${PORT}`);
});
