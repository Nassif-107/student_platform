import mongoose from 'mongoose';

/**
 * Check if a string is a valid MongoDB ObjectId.
 */
export function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Sanitize an ID for use in InfluxDB Flux queries.
 * Only allows alphanumeric characters and hyphens.
 * Returns empty string if input is not a valid ObjectId.
 */
export function sanitizeIdForFlux(id: string): string {
  if (!isValidObjectId(id)) {
    return '';
  }
  return id.replace(/[^a-zA-Z0-9-]/g, '');
}
