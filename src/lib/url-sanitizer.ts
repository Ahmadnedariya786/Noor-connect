/**
 * URL Sanitization and Validation Utility
 * Hardens URLs against XSS, open redirects, and protocol smuggling.
 */

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'blob:']);
const ARCHIVE_ORG_HOSTNAME = 'archive.org';

/**
 * Checks whether a given URL string safely points to the archive.org domain.
 * Avoids incomplete substring matches (e.g. attacker-archive.org) by checking parsed hostname.
 */
export function isArchiveOrgUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  try {
    const parsed = new URL(rawUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    return parsed.hostname === ARCHIVE_ORG_HOSTNAME || parsed.hostname.endsWith(`.${ARCHIVE_ORG_HOSTNAME}`);
  } catch {
    return false;
  }
}

/**
 * Sanitizes a URL for safe embedding in iframes or opening via window.open.
 * Strips dangerous schemes (javascript:, data:, vbscript:) and encodes dangerous HTML characters.
 */
export function sanitizeUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';

  const trimmed = rawUrl.trim();
  // Reject dangerous schemes
  if (/^(javascript|vbscript|data):/i.test(trimmed)) {
    return '';
  }

  // Remove dangerous control / html characters
  const cleaned = trimmed
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  try {
    const parsed = new URL(cleaned, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return '';
    }
    return parsed.href;
  } catch {
    // Check if safe relative path
    if (cleaned.startsWith('/') && !cleaned.startsWith('//')) {
      return cleaned;
    }
    return '';
  }
}

/**
 * Format string sanitizer for console and log output.
 * Replaces '%' format specifiers to prevent format string injection vulnerabilities.
 */
export function sanitizeFormatString(input: unknown): string {
  if (input === null || input === undefined) return '';
  return String(input).replace(/%/g, '%%');
}
