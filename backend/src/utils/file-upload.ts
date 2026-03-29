/**
 * Shared file-saving utility for multipart uploads.
 * Used by materials and forum modules.
 */
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import type { MultipartFile } from '@fastify/multipart';
import { env } from '../config/env.js';

/** A MultipartFile that may already have its content buffered (e.g. after validation). */
export interface BufferedFile extends MultipartFile {
  _buffer?: Buffer;
}

export interface SavedFile {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

/**
 * Save uploaded files to disk under `UPLOAD_DIR/{subdirectory}/`.
 * Returns metadata for each saved file.
 */
export async function saveUploadedFiles(
  files: BufferedFile[],
  subdirectory: string,
): Promise<SavedFile[]> {
  if (files.length === 0) return [];

  const uploadDir = path.join(env.UPLOAD_DIR, subdirectory);
  await fs.mkdir(uploadDir, { recursive: true });

  const saved: SavedFile[] = [];

  for (const file of files) {
    const ext = path.extname(file.filename).toLowerCase() || '';
    const safeFilename = `${randomUUID()}${ext}`;
    const filePath = path.join(uploadDir, safeFilename);
    const buffer = file._buffer ?? await file.toBuffer();
    await fs.writeFile(filePath, buffer);

    saved.push({
      filename: safeFilename,
      originalName: file.filename,
      mimeType: file.mimetype,
      size: buffer.length,
      url: `/uploads/${subdirectory}/${safeFilename}`,
    });
  }

  return saved;
}
