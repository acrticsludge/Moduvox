import express from "express";
import { z } from "zod";
import { PDFDocument } from "pdf-lib";
import { execSync } from "child_process";
import { createWriteStream, existsSync, mkdirSync, rmSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";
import { pipeline } from "stream/promises";
import fetch from "node-fetch";

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

// ── Auth middleware ──
function auth(req, res, next) {
  if (!API_KEY) return next(); // no key configured = skip auth (dev only)
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  }
  const token = header.slice(7);

  // Constant-time comparison
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

// ── Zod schema ──
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
  // Validate input
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

  // Ensure clean working directory
  if (existsSync(TMP_DIR)) rmSync(TMP_DIR, { recursive: true });
  mkdirSync(TMP_DIR, { recursive: true });

  try {
    console.log(`[convert] Downloading PPTX from ${pptxUrl}`);
    await downloadFile(pptxUrl, tmpInput);

    console.log("[convert] Converting PPTX -> PDF via LibreOffice");
    execSync(
      `soffice --headless --convert-to pdf --outdir ${TMP_DIR} ${tmpInput}`,
      {
        timeout: 180_000, // 3 min for conversion
        stdio: "pipe",
      },
    );

    if (!existsSync(tmpOutput)) {
      throw new Error("LibreOffice did not produce output PDF");
    }

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
    // Cleanup
    if (existsSync(TMP_DIR)) rmSync(TMP_DIR, { recursive: true });
  }
});

// ── Health check ──
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// ── Start ──
app.listen(PORT, () => {
  console.log(`PPT converter worker listening on port ${PORT}`);
});
