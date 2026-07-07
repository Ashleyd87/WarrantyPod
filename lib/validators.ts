import { z } from "zod";
import { CATEGORIES, CLAIM_STATUSES, WARRANTY_TYPES } from "./constants";

const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

export const productItemSchema = z.object({
  brand: z.string().trim().min(1, "Brand is required").max(120),
  modelName: z.string().trim().min(1, "Model is required").max(200),
  category: z.enum(CATEGORIES),
  serialNumber: z.preprocess(
    emptyToNull,
    z.string().trim().max(120).nullable()
  ),
  purchaseDate: z.preprocess(
    emptyToNull,
    z.coerce.date().nullable()
  ),
  purchasePrice: z.preprocess(
    emptyToNull,
    z.coerce.number().min(0).max(10_000_000).nullable()
  ),
  currency: z.string().trim().length(3).toUpperCase().default("USD"),
  storeName: z.preprocess(emptyToNull, z.string().trim().max(200).nullable()),
  warrantyType: z.enum(WARRANTY_TYPES),
  warrantyProvider: z.preprocess(
    emptyToNull,
    z.string().trim().max(200).nullable()
  ),
  warrantyDurationMonths: z.preprocess(
    emptyToNull,
    z.coerce.number().int().min(0).max(600).nullable()
  ),
  warrantyExpirationDate: z.preprocess(
    emptyToNull,
    z.coerce.date().nullable()
  ),
  warrantyAssumed: z.coerce.boolean().default(false),
  notes: z.preprocess(emptyToNull, z.string().trim().max(5000).nullable()),
});

export type ProductItemInput = z.infer<typeof productItemSchema>;

export const claimSchema = z.object({
  issueDescription: z.string().trim().min(1, "Describe the issue").max(5000),
  claimNumber: z.preprocess(emptyToNull, z.string().trim().max(120).nullable()),
  providerContact: z.preprocess(
    emptyToNull,
    z.string().trim().max(500).nullable()
  ),
  status: z.enum(CLAIM_STATUSES).default("DRAFT"),
});

export type ClaimInput = z.infer<typeof claimSchema>;

export const settingsSchema = z.object({
  reminderLeadDays: z.coerce.number().int().min(1).max(365),
  currency: z.string().trim().length(3).toUpperCase(),
});

/** Shape the LLM extraction must return (also used to validate mock mode). */
export const extractionSchema = z.object({
  brand: z.string().nullable(),
  modelName: z.string().nullable(),
  serialNumber: z.string().nullable(),
  purchaseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  storeName: z.string().nullable(),
  purchasePrice: z.number().nullable(),
  currency: z.string().length(3).nullable(),
  suggestedCategory: z.enum(CATEGORIES).nullable(),
  estimatedWarrantyMonths: z.number().int().min(0).max(600).nullable(),
  warrantyAssumed: z.boolean(),
  confidence: z
    .record(z.string(), z.enum(["high", "medium", "low"]))
    .default({}),
});

export type ExtractionResult = z.infer<typeof extractionSchema>;
