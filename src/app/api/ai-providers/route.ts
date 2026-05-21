import { NextRequest, NextResponse } from "next/server";
import { db, withDb } from "@/lib/db";
import { encryptApiKey, maskApiKey, decryptApiKey } from "@/lib/ai/crypto";

/** GET /api/ai-providers — list all (api keys masked) */
export async function GET() {
  try {
    const items = await withDb(() => db.aIProvider.findMany({
      orderBy: [{ isDefault: "desc" }, { priority: "desc" }, { createdAt: "asc" }],
    }));
    const safe = items.map((p) => ({
      ...p,
      apiKey: maskApiKey(decryptApiKey(p.apiKey)),
      apiKeyEmpty: !p.apiKey,
    }));
    return NextResponse.json({ success: true, data: safe });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "查询失败" },
      { status: 500 }
    );
  }
}

/** POST /api/ai-providers — create */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      type,
      baseUrl,
      apiKey,
      model,
      supportsWebSearch = false,
      isDefault = false,
      isActive = true,
      priority = 0,
    } = body as {
      name: string;
      type: string;
      baseUrl: string;
      apiKey?: string;
      model: string;
      supportsWebSearch?: boolean;
      isDefault?: boolean;
      isActive?: boolean;
      priority?: number;
    };

    if (!name || !type || !baseUrl || !model) {
      return NextResponse.json(
        { success: false, error: "name / type / baseUrl / model 为必填" },
        { status: 400 }
      );
    }

    // If setting as default, clear other defaults
    if (isDefault) {
      await withDb(() => db.aIProvider.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      }));
    }

    const created = await withDb(() => db.aIProvider.create({
      data: {
        name,
        type,
        baseUrl: baseUrl.replace(/\/+$/, ""),
        apiKey: apiKey ? encryptApiKey(apiKey) : "",
        model,
        supportsChat: true,
        supportsWebSearch,
        isDefault,
        isActive,
        priority,
      },
    }));

    return NextResponse.json({
      success: true,
      data: { ...created, apiKey: maskApiKey(decryptApiKey(created.apiKey)) },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "创建失败" },
      { status: 500 }
    );
  }
}