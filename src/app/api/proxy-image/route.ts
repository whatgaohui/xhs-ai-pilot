import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side image proxy to bypass XHS CDN Referer hotlink protection.
 *
 * XHS CDN URLs (e.g. sns-webpic-qc.xhscdn.com, ci.xiaohongshu.com) reject
 * direct browser requests because they check the Referer header. This route
 * fetches the image server-side (no Referer sent) and pipes it back to the client.
 *
 * Usage: /api/proxy-image?url=<encoded XHS image URL>
 */

// XHS CDN domains that need proxying
const XHS_CDN_DOMAINS = [
  "xhscdn.com",
  "xiaohongshu.com",
  "xhscdn.cn",
  "ci.xiaohongshu.com",
  "sns-webpic-qc.xhscdn.com",
  "sns-webpic-df.xhscdn.com",
  "sns-webpic-hw.xhscdn.com",
  "sns-video-bd.xhscdn.com",
  "sns-video-qc.xhscdn.com",
  "sns-video-hw.xhscdn.com",
];

function isXhsCdnUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return XHS_CDN_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith("." + domain)
    );
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get("url");

  if (!urlParam) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // Decode the URL
  const imageUrl = decodeURIComponent(urlParam);

  // Validate URL format
  if (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Only proxy XHS CDN URLs (security measure)
  if (!isXhsCdnUrl(imageUrl)) {
    // For non-XHS URLs, redirect directly
    return NextResponse.redirect(imageUrl);
  }

  try {
    // Fetch the image server-side with a spoofed Referer to bypass hotlink protection
    const response = await fetch(imageUrl, {
      headers: {
        // Spoof Referer as coming from XHS to bypass hotlink protection
        Referer: "https://www.xiaohongshu.com/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
      // @ts-expect-error - Next.js fetch cache option
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      console.error(
        `[proxy-image] Failed to fetch: ${response.status} ${response.statusText} for ${imageUrl}`
      );
      return NextResponse.json(
        { error: `Upstream error: ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("[proxy-image] Error fetching image:", error);
    return NextResponse.json(
      { error: "Failed to fetch image" },
      { status: 500 }
    );
  }
}
