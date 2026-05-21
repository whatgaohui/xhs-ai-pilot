/**
 * File Server — Serves uploaded files from disk
 *
 * Simple Bun HTTP server on port 3001 for serving uploaded files.
 * Uses basic file reading to avoid any issues with streaming APIs.
 */

const PORT = 3001;
const UPLOAD_DIR = "/home/z/my-project/public/uploads";

const MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".pdf": "application/pdf",
};

function getExt(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i >= 0 ? filename.slice(i).toLowerCase() : "";
}

Bun.serve({
  port: PORT,
  fetch(req) {
    try {
      const url = new URL(req.url);

      // Health check
      if (url.pathname === "/health") {
        return new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      // Build safe file path - strip leading /uploads/ if present
      let segments = url.pathname.split("/").filter(Boolean);
      // Handle both /filename.png and /uploads/filename.png patterns
      if (segments[0] === "uploads") {
        segments = segments.slice(1);
      }

      if (segments.length === 0) {
        return new Response("Not Found", { status: 404 });
      }

      // Prevent path traversal
      const safePath = segments.join("/");
      if (safePath.includes("..")) {
        return new Response("Forbidden", { status: 403 });
      }

      const filePath = UPLOAD_DIR + "/" + safePath;
      const ext = getExt(filePath);
      const contentType = MIME_MAP[ext] || "application/octet-stream";

      // Use Bun.file() for efficient serving
      const file = Bun.file(filePath);

      // Check if file exists
      return file.exists().then((exists) => {
        if (!exists) {
          return new Response("Not Found", { status: 404 });
        }
        return new Response(file, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=31536000, immutable",
            "Accept-Ranges": "bytes",
          },
        });
      });
    } catch (error) {
      console.error("[file-server] Error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
});

console.log(`File server running on http://localhost:${PORT}`);
console.log(`Serving files from: ${UPLOAD_DIR}`);
