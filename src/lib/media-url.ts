/**
 * Media URL helper — converts stored paths to proper URLs
 *
 * Files are served by the file-server microservice on port 3001,
 * routed through the Caddy gateway using XTransformPort.
 * This avoids routing file traffic through the Next.js server,
 * which can crash under concurrent file serving load.
 */

const FILE_SERVER_PORT = 3001;

/**
 * Convert a stored media URL to a proper serving URL.
 * Handles both /api/uploads/... and /uploads/... prefixes.
 *
 * Examples:
 *   "/api/uploads/xxx.png" → "/uploads/xxx.png?XTransformPort=3001"
 *   "/uploads/xxx.png"     → "/uploads/xxx.png?XTransformPort=3001"
 *   ""                     → ""
 */
export function getMediaUrl(url: string): string {
  if (!url) return '';

  // Strip /api prefix if present (legacy format)
  const cleanPath = url.replace(/^\/api/, '');

  // Add XTransformPort for file server routing through Caddy
  return `${cleanPath}?XTransformPort=${FILE_SERVER_PORT}`;
}

/**
 * Get a media URL without the XTransformPort parameter.
 * Useful for download links or when the file server is accessed directly.
 */
export function getMediaPath(url: string): string {
  if (!url) return '';
  return url.replace(/^\/api/, '');
}
