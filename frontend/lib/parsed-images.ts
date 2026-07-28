/**
 * Store parsed PPTX images in R2 for persistence across page refreshes.
 *
 * Images from PPTX parsing are large base64 strings that can't be stored in
 * editor_state (bloats auto-save beyond Supabase column limits). Instead, we
 * save them to R2 during initial parse and store only the keys in editor_state.
 * On page restore, signed URLs are generated from the stored keys.
 */
import { uploadFile, createDownloadUrl } from "./r2"

const PARSED_IMAGE_PREFIX = "parsed-images"

/** MIME type → file extension mapping */
function extForMime(mimeType: string): string {
  switch (mimeType) {
    case "image/png": return "png"
    case "image/jpeg": return "jpg"
    case "image/webp": return "webp"
    default: return "bin"
  }
}

/**
 * Save a single parsed image to R2 and return its storage key.
 * Key format: {userId}/parsed-images/{presentationId}/{slideNumber}-{imageIndex}.{ext}
 */
export async function saveParsedImage(
  userId: string,
  presentationId: string,
  slideNumber: number,
  imageIndex: number,
  mimeType: string,
  dataBase64: string,
): Promise<string> {
  const ext = extForMime(mimeType)
  const key = `${userId}/${PARSED_IMAGE_PREFIX}/${presentationId}/${slideNumber}-${imageIndex}.${ext}`

  const buffer = Buffer.from(dataBase64, "base64")
  const result = await uploadFile(key, buffer, mimeType)

  if (!result.success) {
    console.warn(`[parsed-images] Failed to save image ${key}: ${result.error}`)
    return ""
  }
  return key
}

/**
 * Generate a signed download URL for a stored parsed image.
 * Returns the R2 key itself if URL generation fails (caller handles fallback).
 */
export async function getStoredImageUrl(r2Key: string): Promise<string | null> {
  try {
    return await createDownloadUrl(r2Key, 86400) // 24h expiry
  } catch {
    return null
  }
}

/**
 * Batch-load stored image keys and return signed URLs.
 * Returns a map of original key → signed URL.
 */
export async function batchGetStoredImageUrls(keys: string[]): Promise<Record<string, string | null>> {
  const results: Record<string, string | null> = {}
  await Promise.all(
    keys.map(async (key) => {
      results[key] = await getStoredImageUrl(key)
    }),
  )
  return results
}
