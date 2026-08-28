import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { isMockMode } from "./extraction";

// Finds an illustrative product photo for an item the user hasn't
// photographed. The model proposes candidate image URLs from the web; we
// never trust them — each is fetched and must actually return an image
// before it's stored. URLs are hotlinked, so the client always keeps a
// placeholder fallback for when one later 404s.

const MAX_CANDIDATES = 4;
const FETCH_TIMEOUT_MS = 6000;
const MIN_IMAGE_BYTES = 2_000; // reject tracking pixels / 1x1 spacers

const candidatesSchema = z.object({
  imageUrls: z.array(z.string()).max(8).default([]),
});

const RECORD_TOOL: Anthropic.Tool = {
  name: "record_product_images",
  description:
    "Record direct image URLs for the product, best first. Empty list if none found.",
  input_schema: {
    type: "object",
    properties: {
      imageUrls: {
        type: "array",
        items: { type: "string" },
        description:
          "Direct URLs to product photo files (ending .jpg/.jpeg/.png/.webp) from the manufacturer's or a major retailer's site. Must be the image file itself, not the page it appears on. Prefer a plain product shot on a white background. Omit anything you did not actually see in search results.",
      },
    },
    required: ["imageUrls"],
  },
};

export interface ProductImageResult {
  imageUrl: string | null;
  /** WEB when an image was verified, NONE when the search came up empty. */
  source: "WEB" | "NONE";
}

/** Fetches the URL and confirms it really is a reachable image. */
async function verifyImage(url: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  // Only https, and never let a lookup reach a private/internal address.
  if (parsed.protocol !== "https:") return false;
  if (/^(localhost$|127\.|10\.|192\.168\.|169\.254\.|\[)/i.test(parsed.hostname)) {
    return false;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { Accept: "image/*" },
    });
    if (!res.ok) return false;
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return false;
    const length = Number(res.headers.get("content-length") ?? "0");
    if (length && length < MIN_IMAGE_BYTES) return false;
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function findProductImage(item: {
  brand: string;
  modelName: string;
  category?: string | null;
  barcode?: string | null;
}): Promise<ProductImageResult> {
  if (isMockMode()) return { imageUrl: null, source: "NONE" };

  const anthropic = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
  const label = `${item.brand} ${item.modelName}`.trim();

  const response = await anthropic.messages.create({
    model,
    max_tokens: 1500,
    system:
      "You find official product photography. Only report image URLs you actually saw in search results — never guess a URL pattern or invent a filename. Prefer the manufacturer's own product page, then a major retailer.",
    tools: [
      { type: "web_search_20250305", name: "web_search", max_uses: 4 } as Anthropic.ToolUnion,
      RECORD_TOOL,
    ],
    messages: [
      {
        role: "user",
        content: `Find a product photo of this exact item: "${label}"${
          item.barcode ? ` (barcode ${item.barcode})` : ""
        }${item.category ? `, category ${item.category}` : ""}. Search the web, then call record_product_images with direct image-file URLs, best match first.`,
      },
    ],
  });

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock =>
      b.type === "tool_use" && b.name === "record_product_images"
  );
  if (!toolUse) return { imageUrl: null, source: "NONE" };

  const parsed = candidatesSchema.safeParse(toolUse.input);
  if (!parsed.success) return { imageUrl: null, source: "NONE" };

  for (const url of parsed.data.imageUrls.slice(0, MAX_CANDIDATES)) {
    if (await verifyImage(url)) return { imageUrl: url, source: "WEB" };
  }
  return { imageUrl: null, source: "NONE" };
}
