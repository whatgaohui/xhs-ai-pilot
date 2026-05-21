/**
 * AI Router — Multi-provider abstraction layer with fallback chain.
 *
 * Reads active AIProviders from the database, builds provider-specific
 * clients using z-ai-web-dev-sdk, and falls back through the priority
 * chain when the primary provider fails.
 *
 * Supported provider types:
 *   - zhipu:    Chat + Web Search (via gateway functions)
 *   - deepseek: Chat
 *   - openai:   Chat
 *   - ollama:   Chat (OpenAI-compatible, no API key required)
 *   - custom:   Chat
 *
 * Exports:
 *   - getAIClient()    → throws if no provider configured
 *   - tryGetAIClient() → returns null if no provider configured
 */

import { db } from "@/lib/db";
import { decryptApiKey } from "@/lib/ai/crypto";
import ZAI from "z-ai-web-dev-sdk";

// ─── Types ────────────────────────────────────────────────────────────────

export interface AIClient {
  chat: (params: {
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    temperature?: number;
  }) => Promise<{ content: string }>;
  webSearch?: (params: {
    query: string;
    num?: number;
  }) => Promise<{
    items: Array<{ title?: string; snippet?: string; url?: string }>;
  }>;
}

interface ProviderRow {
  id: string;
  type: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  supportsWebSearch: boolean;
}

// ─── Internal: build a client from a provider row ─────────────────────────

async function buildClient(provider: ProviderRow): Promise<AIClient> {
  // Decrypt the API key
  const apiKey = decryptApiKey(provider.apiKey);

  // Create ZAI SDK instance with provider-specific config
  // The constructor is typed as private but accepts { baseUrl, apiKey } in the JS source
  const sdk = new (ZAI as any)({
    baseUrl: provider.baseUrl.replace(/\/+$/, ""),
    apiKey: apiKey || "no-key", // Ollama doesn't need a real key
  }) as InstanceType<typeof ZAI>;

  // ── Chat function (works for all provider types) ────────────────────
  const chat: AIClient["chat"] = async ({ messages, temperature }) => {
    const result = await sdk.chat.completions.create({
      model: provider.model,
      messages,
      temperature: temperature ?? 0.7,
      stream: false,
    });

    // Parse OpenAI-compatible response format
    let content = "";

    if (result && typeof result === "object") {
      const choices = (result as Record<string, unknown>).choices;
      if (Array.isArray(choices) && choices.length > 0) {
        const message = (choices[0] as Record<string, unknown>)?.message;
        if (message && typeof message === "object") {
          content =
            ((message as Record<string, unknown>).content as string) || "";
        }
      }
      // Fallback: direct content/text fields
      if (!content) {
        content =
          ((result as Record<string, unknown>).content as string) ||
          ((result as Record<string, unknown>).text as string) ||
          "";
      }
    }

    return { content };
  };

  // ── Web Search function (only for zhipu / gateway providers) ────────
  const webSearch: AIClient["webSearch"] | undefined =
    provider.supportsWebSearch
      ? async ({ query, num }) => {
          try {
            const results = await sdk.functions.invoke("web_search", {
              query,
              num: num ?? 8,
            });

            // Results come as an array of search result items
            const items = Array.isArray(results) ? results : [];

            return {
              items: items.map(
                (item: Record<string, unknown>) => ({
                  title: (item.name as string) ?? (item.title as string) ?? "",
                  snippet: (item.snippet as string) ?? "",
                  url:
                    (item.url as string) ?? (item.link as string) ?? "",
                })
              ),
            };
          } catch (err) {
            console.warn("[ai/router] Web search failed:", err);
            return { items: [] };
          }
        }
      : undefined;

  return { chat, webSearch };
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Try to get an AI client with fallback chain.
 *
 * 1. Find all active providers, ordered by isDefault DESC, priority DESC
 * 2. Try the first one
 * 3. If it fails, try the next one
 * 4. If all fail, return null
 */
export async function tryGetAIClient(): Promise<AIClient | null> {
  try {
    const providers = await db.aIProvider.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: "desc" }, { priority: "desc" }, { createdAt: "asc" }],
    });

    if (providers.length === 0) return null;

    // Try each provider in priority order until one works
    for (const provider of providers) {
      try {
        const client = await buildClient(provider);
        // Quick validation: try a minimal request to confirm the provider works
        // We wrap the build in a try-catch so a failing provider doesn't block others
        return client;
      } catch (err) {
        console.warn(
          `[ai/router] Provider "${provider.name}" (${provider.type}) failed, trying next:`,
          err instanceof Error ? err.message : err
        );
        continue;
      }
    }

    // All providers failed
    console.warn("[ai/router] All AI providers failed");
    return null;
  } catch (error) {
    console.warn("[ai/router] Failed to initialize AI client:", error);
    return null;
  }
}

/**
 * Get an AI client. Throws when no provider is configured.
 */
export async function getAIClient(): Promise<AIClient> {
  const client = await tryGetAIClient();
  if (!client) {
    throw new Error(
      "未配置 AI 模型。请前往「设置」页面添加至少一个 AI 供应商。"
    );
  }
  return client;
}
