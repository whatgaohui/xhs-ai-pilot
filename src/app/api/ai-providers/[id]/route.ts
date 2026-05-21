import { NextRequest, NextResponse } from "next/server";
import { db, withDb } from "@/lib/db";
import { encryptApiKey, maskApiKey, decryptApiKey } from "@/lib/ai/crypto";

/** PATCH /api/ai-providers/[id] — update */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      name,
      type,
      baseUrl,
      apiKey,
      model,
      supportsWebSearch,
      isDefault,
      isActive,
      priority,
    } = body as Partial<{
      name: string;
      type: string;
      baseUrl: string;
      apiKey: string;
      model: string;
      supportsWebSearch: boolean;
      isDefault: boolean;
      isActive: boolean;
      priority: number;
    }>;

    const exists = await withDb(() => db.aIProvider.findUnique({ where: { id } }));
    if (!exists) {
      return NextResponse.json(
        { success: false, error: "Provider 不存在" },
        { status: 404 }
      );
    }

    // If setting as default, clear other defaults
    if (isDefault === true && !exists.isDefault) {
      await withDb(() => db.aIProvider.updateMany({
        where: { isDefault: true, NOT: { id } },
        data: { isDefault: false },
      }));
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (type !== undefined) data.type = type;
    if (baseUrl !== undefined) data.baseUrl = baseUrl.replace(/\/+$/, "");
    if (model !== undefined) data.model = model;
    if (supportsWebSearch !== undefined) data.supportsWebSearch = supportsWebSearch;
    if (isDefault !== undefined) data.isDefault = isDefault;
    if (isActive !== undefined) data.isActive = isActive;
    if (priority !== undefined) data.priority = priority;
    // Only update apiKey if explicitly provided (and non-empty)
    if (apiKey !== undefined && apiKey !== "") {
      data.apiKey = encryptApiKey(apiKey);
    }

    const updated = await withDb(() => db.aIProvider.update({ where: { id }, data }));

    return NextResponse.json({
      success: true,
      data: { ...updated, apiKey: maskApiKey(decryptApiKey(updated.apiKey)) },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "更新失败" },
      { status: 500 }
    );
  }
}

/** DELETE /api/ai-providers/[id] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await withDb(() => db.aIProvider.delete({ where: { id } }));
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "删除失败" },
      { status: 500 }
    );
  }
}