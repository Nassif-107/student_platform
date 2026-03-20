/**
 * Validate file content by checking magic bytes (file signatures).
 * More secure than relying on Content-Type header which can be spoofed.
 */

const IMAGE_SIGNATURES: { mime: string; bytes: number[] }[] = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] }, // "RIFF" prefix
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46] }, // "GIF"
];

const DOCUMENT_SIGNATURES: { mime: string; bytes: number[] }[] = [
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] }, // "%PDF"
  { mime: 'application/zip', bytes: [0x50, 0x4b, 0x03, 0x04] }, // PK\x03\x04 (also .docx, .pptx)
];

const ALL_SIGNATURES = [...IMAGE_SIGNATURES, ...DOCUMENT_SIGNATURES];

/**
 * Detect the actual MIME type of a file buffer by reading its magic bytes.
 * Returns the detected MIME type or null if unrecognized.
 */
export function detectMimeType(buffer: Buffer): string | null {
  for (const sig of ALL_SIGNATURES) {
    if (buffer.length >= sig.bytes.length) {
      const match = sig.bytes.every((byte, i) => buffer[i] === byte);
      if (match) return sig.mime;
    }
  }
  return null;
}

/**
 * Validate that a file buffer matches one of the allowed MIME types.
 * Checks both the declared MIME type and the actual magic bytes.
 */
export function validateFileType(
  buffer: Buffer,
  declaredMime: string,
  allowedMimes: string[]
): { valid: boolean; detectedMime: string | null } {
  if (!allowedMimes.includes(declaredMime)) {
    return { valid: false, detectedMime: null };
  }

  const detectedMime = detectMimeType(buffer);

  if (!detectedMime) {
    return { valid: false, detectedMime: null };
  }

  // For zip-based formats (.docx, .pptx), detected MIME will be application/zip
  // which is valid for the declared MIME
  if (detectedMime === 'application/zip' && (
    declaredMime.includes('word') ||
    declaredMime.includes('presentation') ||
    declaredMime === 'application/zip'
  )) {
    return { valid: true, detectedMime };
  }

  return { valid: allowedMimes.includes(detectedMime), detectedMime };
}
