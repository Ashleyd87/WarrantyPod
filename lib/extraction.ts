import Anthropic from "@anthropic-ai/sdk";
import { CATEGORIES } from "./constants";
import { extractionSchema, type ExtractionResult } from "./validators";

const EXTRACTION_TOOL: Anthropic.Tool = {
  name: "record_extraction",
  description:
    "Record the structured product/purchase data extracted from the provided photos.",
  input_schema: {
    type: "object",
    properties: {
      brand: { type: ["string", "null"], description: "Product brand/manufacturer" },
      modelName: { type: ["string", "null"], description: "Model name or number" },
      serialNumber: {
        type: ["string", "null"],
        description:
          "Serial number (S/N). Prefer the value labeled S/N or Serial over barcodes/model numbers.",
      },
      purchaseDate: {
        type: ["string", "null"],
        description: "Purchase date as YYYY-MM-DD",
      },
      storeName: { type: ["string", "null"], description: "Retailer/store name" },
      purchasePrice: {
        type: ["number", "null"],
        description: "Total price paid for this product (not the whole receipt if multiple items)",
      },
      currency: {
        type: ["string", "null"],
        description: "ISO 4217 currency code, e.g. USD, AUD, GBP",
      },
      suggestedCategory: {
        type: ["string", "null"],
        enum: [...CATEGORIES, null] as unknown as string[],
        description: "Best-fit product category",
      },
      estimatedWarrantyMonths: {
        type: ["integer", "null"],
        description:
          "Warranty length in months ONLY if explicitly stated on the documents; otherwise null. Never guess.",
      },
      warrantyAssumed: {
        type: "boolean",
        description:
          "true when no explicit warranty information was visible in the images",
      },
      confidence: {
        type: "object",
        description:
          "Per-field confidence, keys matching the field names, values high|medium|low",
        additionalProperties: { type: "string", enum: ["high", "medium", "low"] },
      },
    },
    required: ["warrantyAssumed", "confidence"],
  },
};

const SYSTEM_PROMPT = `You are a meticulous data-entry assistant for a household warranty vault.
You are given photos of a purchase receipt and/or a product serial-number sticker.
Extract only what you can actually read. Use null for anything not visible or ambiguous —
never invent values. Dates must be YYYY-MM-DD; if the receipt uses DD/MM/YYYY vs MM/DD/YYYY
and it is ambiguous, pick the interpretation consistent with the store's country and mark
confidence low. For serial numbers, transcribe exactly, preserving letters/digits (0 vs O, 1 vs I).
Report per-field confidence honestly.`;

export function isMockMode(): boolean {
  return !process.env.ANTHROPIC_API_KEY;
}

export async function extractFromImages(
  images: { mimeType: string; base64: string }[]
): Promise<ExtractionResult> {
  if (isMockMode()) return mockExtraction();

  const anthropic = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

  const content: Anthropic.ContentBlockParam[] = [
    {
      type: "text",
      text: "Extract the product, purchase and warranty details from these photos.",
    },
    ...images.map(
      (img): Anthropic.ImageBlockParam => ({
        type: "image",
        source: {
          type: "base64",
          media_type: img.mimeType as "image/jpeg" | "image/png" | "image/webp",
          data: img.base64,
        },
      })
    ),
  ];

  const response = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: [EXTRACTION_TOOL],
    tool_choice: { type: "tool", name: "record_extraction" },
    messages: [{ role: "user", content }],
  });

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
  );
  if (!toolUse) throw new Error("Model returned no extraction");

  return extractionSchema.parse(toolUse.input);
}

/** Demo data used when no ANTHROPIC_API_KEY is configured. */
function mockExtraction(): ExtractionResult {
  return extractionSchema.parse({
    brand: "Samsung",
    modelName: "WW90T534DAW Washing Machine",
    serialNumber: "0B7X5AEW400392K",
    purchaseDate: "2025-11-14",
    storeName: "Harvey Norman",
    purchasePrice: 899.0,
    currency: "AUD",
    suggestedCategory: "APPLIANCE",
    estimatedWarrantyMonths: 24,
    warrantyAssumed: false,
    confidence: {
      brand: "high",
      modelName: "high",
      serialNumber: "medium",
      purchaseDate: "high",
      storeName: "high",
      purchasePrice: "high",
      estimatedWarrantyMonths: "medium",
    },
  });
}
