import { NextRequest, NextResponse } from 'next/server';

const SCRAPER_SERVICE_URL = 'http://localhost:3002';

/**
 * POST /api/accounts/validate-cookies
 * Validate XHS cookies by making a test request to the scraper service.
 */
export async function POST(request: NextRequest) {
  try {
    const { cookies } = await request.json();

    if (!cookies || typeof cookies !== 'string') {
      return NextResponse.json(
        { success: false, error: '请提供Cookie' },
        { status: 400 }
      );
    }

    // Try a lightweight profile request to validate cookies
    // Use a test URL - the important thing is whether the cookies are accepted
    try {
      const res = await fetch(
        `${SCRAPER_SERVICE_URL}/api/scrape/profile?XTransformPort=3002`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: 'https://www.xiaohongshu.com/explore',
            cookies,
          }),
          signal: AbortSignal.timeout(15000),
        }
      );

      const data = await res.json();

      if (data.success && data.data?.scrapeMethod === 'cookie_api') {
        return NextResponse.json({
          success: true,
          valid: true,
          message: 'Cookie有效，可以采集数据',
        });
      }

      // Cookies didn't work for API access
      return NextResponse.json({
        success: true,
        valid: false,
        message: 'Cookie无效或已过期，请重新获取',
      });
    } catch {
      // Scraper service might be down
      // Do a basic check: cookies should contain key XHS identifiers
      const hasXhsCookies =
        cookies.includes('web_session') ||
        cookies.includes('a1') ||
        cookies.includes('webId');

      if (hasXhsCookies) {
        return NextResponse.json({
          success: true,
          valid: true,
          message: 'Cookie格式正确（无法验证有效性，采集服务离线）',
        });
      }

      return NextResponse.json({
        success: true,
        valid: false,
        message: 'Cookie格式不正确，请确保复制了完整的小红书Cookie',
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '验证失败',
      },
      { status: 500 }
    );
  }
}
