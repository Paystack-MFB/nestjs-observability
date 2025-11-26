import { randomUUID } from 'crypto';

/**
 * Extract tag from HTTP headers with fallback to UUID generation
 * Matches legacy ps-api behavior: tag → x-aws-sqsd-attr-tag → generate UUID
 *
 * @param headers - HTTP request headers (lowercase keys as normalized by Node.js)
 * @returns Tag value to use for request correlation
 */
export function extractTag(headers?: Record<string, string | string[] | undefined>): string {
  if (!headers) {
    return randomUUID();
  }

  // Priority 1: Direct tag header
  const tagHeader = headers['tag'];
  if (tagHeader) {
    return Array.isArray(tagHeader) ? tagHeader[0] : tagHeader;
  }

  // Priority 2: SQS daemon attribute header
  const sqsTagHeader = headers['x-aws-sqsd-attr-tag'];
  if (sqsTagHeader) {
    return Array.isArray(sqsTagHeader) ? sqsTagHeader[0] : sqsTagHeader;
  }

  // Priority 3: Generate fresh UUID
  return randomUUID();
}

/**
 * Get tag header names to check (for configuration/documentation)
 */
export function getTagHeaderNames(): string[] {
  return ['tag', 'x-aws-sqsd-attr-tag'];
}
