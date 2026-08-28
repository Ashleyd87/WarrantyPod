import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { CATEGORIES } from "./constants";
import { isMockMode } from "./extraction";
import { prisma } from "./prisma";

// Turns a scanned product barcode (UPC/EAN) into brand + model so the add
// form arrives pre-filled. Results are cached globally — a barcode maps to
// the same product for everyone, so nobody pays for the same lookup twice.

const lookupSchema = z.object({
  brand: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().max(120).nullable()
  ),
  modelName: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().max(200).nullable()
  ),
  category: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.enum(CATEGORIES).nullable()
  ),
  warrantyMonths: z.preprocess(
    (v) => (v === "" ? null : v),
    z.number().int().min(0).max(600).nullable()
  ),
});

export type BarcodeProduct = z.infer<typeof lookupSchema>;

const RECORD_TOOL: Anthropic.Tool = {
  name: "record_product",
  description: "Record the product identified from the barcode.",
  input_schema: {
    type: "object",
    properties: {
      brand: {
        type: ["string", "null"],
        description: "Manufacturer/brand name, or null if not confidently found.",
      },
      modelName: {
        type: ["string", "null"],
        description:
          "Product model name or number as the manufacturer writes it. Null if not found.",
      },
      category: {
        type: ["string", "null"],
        enum: [...CATEGORIES, null] as unknown as string[],
        description: "Best-fit category for the product.",
      },
      warrantyMonths: {
        type: ["integer", "null"],
        description:
          "Standard manufacturer warranty length in months, only if stated on an official source. Never guess.",
      },
    },
    required: [],
  },
};

/** Only 8/12/13/14-digit codes are product barcodes (UPC/EAN/ITF-14). */
export function isProductBarcode(code: string): boolean {
  return /^\d{8}$|^\d{12,14}$/.test(code.trim());
}

export async function lookupBarcode(
  rawCode: string
): Promise<{ product: BarcodeProduct; cached: boolean } | null> {
  const code = rawCode.trim();
  if (!isProductBarcode(code)) return null;

  const cached = await prisma.barcodeProduct.findUnique({ where: { code } });
  if (cached) {
    return {
      cached: true,
      product: {
        brand: cached.brand,
        modelName: cached.modelName,
        category: cached.category as BarcodeProduct["category"],
        warrantyMonths: cached.warrantyMonths,
      },
    };
  }

  if (isMockMode()) return null;

  const anthropic = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

  const response = await anthropic.messages.create({
    model,
    max_tokens: 1200,
    system:
      "You identify consumer products from barcode numbers using web search. Report only what search results actually show. If the barcode does not resolve to a specific product, return nulls rather than guessing.",
    tools: [
      { type: "web_search_20250305", name: "web_search", max_uses: 4 } as Anthropic.ToolUnion,
      RECORD_TOOL,
    ],
    messages: [
      {
        role: "user",
        content: `Identify the consumer product with barcode ${code} (UPC/EAN). Search the web for it, then call record_product with the brand and model.`,
      },
    ],
  });

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock =>
      b.type === "tool_use" && b.name === "record_product"
  );
  if (!toolUse) return null;

  const parsed = lookupSchema.safeParse(toolUse.input);
  if (!parsed.success) return null;
  const product = parsed.data;

  // Only cache a useful answer; a miss stays open to a later retry.
  if (product.brand || product.modelName) {
    await prisma.barcodeProduct.upsert({
      where: { code },
      update: { ...product },
      create: { code, ...product },
    });
  }

  return { product, cached: false };
}
