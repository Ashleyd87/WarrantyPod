import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { prisma } from "./prisma";
import { isMockMode } from "./extraction";

// Resolves where a warranty claim should be sent for a manufacturer or
// retailer: a curated directory first, then an AI web-search lookup, with
// results cached in the shared ClaimContact table so each name is only
// researched once. Contacts are not user data — the cache is global.

export type ContactKind = "MANUFACTURER" | "RETAILER";

export interface ClaimContactInfo {
  kind: ContactKind;
  name: string;
  displayName: string;
  email: string | null;
  url: string | null;
  phone: string | null;
  source: "CURATED" | "AI" | "CACHE";
  notes: string | null;
}

/** How long a cached AI lookup stays fresh before being re-researched. */
const CACHE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

// Curated entries carry each company's official warranty/support portal.
// Public claim EMAIL addresses are rare (most run portals), so emails here
// are left to the AI lookup or the user — never guessed.
const CURATED: Record<
  string,
  { kind: ContactKind; email?: string; url?: string; phone?: string; notes?: string }
> = {
  lg: {
    kind: "MANUFACTURER",
    url: "https://www.lg.com/us/support/repair-service",
    phone: "+1-800-243-0000",
  },
  samsung: {
    kind: "MANUFACTURER",
    url: "https://www.samsung.com/us/support/service/",
    phone: "+1-800-726-7864",
  },
  sony: {
    kind: "MANUFACTURER",
    url: "https://www.sony.com/electronics/support",
    phone: "+1-800-222-7669",
  },
  dyson: {
    kind: "MANUFACTURER",
    url: "https://www.dyson.com/support",
    phone: "+1-866-693-9766",
  },
  dewalt: {
    kind: "MANUFACTURER",
    url: "https://www.dewalt.com/support/service-center",
    phone: "+1-800-433-9258",
  },
  apple: {
    kind: "MANUFACTURER",
    url: "https://support.apple.com",
    phone: "+1-800-275-2273",
  },
  bosch: {
    kind: "MANUFACTURER",
    url: "https://www.bosch-home.com/us/service",
    phone: "+1-800-944-2904",
  },
  whirlpool: {
    kind: "MANUFACTURER",
    url: "https://www.whirlpool.com/services/contact-us.html",
    phone: "+1-866-698-2538",
  },
  "best buy": {
    kind: "RETAILER",
    url: "https://www.bestbuy.com/services",
    phone: "+1-888-237-8289",
  },
  amazon: {
    kind: "RETAILER",
    url: "https://www.amazon.com/returns",
  },
  "home depot": {
    kind: "RETAILER",
    url: "https://www.homedepot.com/c/customer_service",
    phone: "+1-800-466-3337",
  },
  "harvey norman": {
    kind: "RETAILER",
    url: "https://www.harveynorman.com.au/customer-service",
    phone: "+61-1300-464-278",
  },
  ikea: {
    kind: "RETAILER",
    url: "https://www.ikea.com/us/en/customer-service/",
    phone: "+1-888-888-4532",
  },
};

const aiContactSchema = z.object({
  email: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().email().nullable()
  ),
  url: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().url().nullable()
  ),
  phone: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().max(40).nullable()
  ),
  notes: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().max(500).nullable()
  ),
});

const RECORD_TOOL: Anthropic.Tool = {
  name: "record_contact",
  description:
    "Record the official warranty-claim contact details found for the company.",
  input_schema: {
    type: "object",
    properties: {
      email: {
        type: ["string", "null"],
        description:
          "Official customer-support / warranty-claims email address, or null if the company only offers a web portal. Never invent an address.",
      },
      url: {
        type: ["string", "null"],
        description:
          "URL of the official warranty-claim or support-request page.",
      },
      phone: {
        type: ["string", "null"],
        description: "Official customer-support phone number with country code.",
      },
      notes: {
        type: ["string", "null"],
        description:
          "One short sentence of guidance, e.g. 'Claims are filed via the portal; email is for general support.'",
      },
    },
    required: [],
  },
};

function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function titleCase(name: string): string {
  return name.replace(/\b\w/g, (c) => c.toUpperCase());
}

async function aiLookup(
  kind: ContactKind,
  name: string
): Promise<z.infer<typeof aiContactSchema> | null> {
  if (isMockMode()) return null;

  const anthropic = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
  const role = kind === "MANUFACTURER" ? "manufacturer" : "retailer/store";

  const response = await anthropic.messages.create({
    model,
    max_tokens: 1500,
    system:
      "You research official customer-support contact details. Only report details published on the company's own official website or verified support pages. If no public claims email exists, return null for email — never guess or fabricate an address.",
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 4,
      } as Anthropic.ToolUnion,
      RECORD_TOOL,
    ],
    messages: [
      {
        role: "user",
        content: `Find where a customer sends a warranty claim to the ${role} "${titleCase(
          name
        )}" (consumer products). Search the web for their official warranty-claims email address, claim/support page URL, and support phone number. When done, call record_contact with what you found.`,
      },
    ],
  });

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock =>
      b.type === "tool_use" && b.name === "record_contact"
  );
  if (!toolUse) return null;
  const parsed = aiContactSchema.safeParse(toolUse.input);
  return parsed.success ? parsed.data : null;
}

export async function lookupClaimContact(
  kind: ContactKind,
  rawName: string
): Promise<ClaimContactInfo | null> {
  const name = normalize(rawName);
  if (!name) return null;

  const base = {
    kind,
    name,
    displayName: titleCase(name),
  };

  // 1. Fresh cache hit
  const cached = await prisma.claimContact.findUnique({
    where: { kind_name: { kind, name } },
  });
  if (cached) {
    const fresh =
      cached.source === "CURATED" ||
      Date.now() - cached.updatedAt.getTime() < CACHE_TTL_MS;
    // A cached row with no email can be retried once AI is configured.
    const retryForEmail = !cached.email && !isMockMode() && !fresh;
    if (!retryForEmail && fresh) {
      return {
        ...base,
        email: cached.email,
        url: cached.url,
        phone: cached.phone,
        source: "CACHE",
        notes: cached.notes,
      };
    }
  }

  // 2. Curated directory
  const curated = CURATED[name];
  if (curated && curated.kind === kind) {
    const saved = await prisma.claimContact.upsert({
      where: { kind_name: { kind, name } },
      update: {
        email: curated.email ?? null,
        url: curated.url ?? null,
        phone: curated.phone ?? null,
        source: "CURATED",
        notes: curated.notes ?? null,
      },
      create: {
        kind,
        name,
        email: curated.email ?? null,
        url: curated.url ?? null,
        phone: curated.phone ?? null,
        source: "CURATED",
        notes: curated.notes ?? null,
      },
    });
    return {
      ...base,
      email: saved.email,
      url: saved.url,
      phone: saved.phone,
      source: "CURATED",
      notes: saved.notes,
    };
  }

  // 3. AI web-search lookup
  let ai: z.infer<typeof aiContactSchema> | null = null;
  try {
    ai = await aiLookup(kind, name);
  } catch (e) {
    console.error(`Contact lookup failed for ${kind} ${name}:`, e);
  }
  if (!ai) {
    // Nothing found (or mock mode) — return the stale cache row if one exists.
    if (cached) {
      return {
        ...base,
        email: cached.email,
        url: cached.url,
        phone: cached.phone,
        source: "CACHE",
        notes: cached.notes,
      };
    }
    return null;
  }

  const saved = await prisma.claimContact.upsert({
    where: { kind_name: { kind, name } },
    update: { email: ai.email, url: ai.url, phone: ai.phone, source: "AI", notes: ai.notes },
    create: {
      kind,
      name,
      email: ai.email,
      url: ai.url,
      phone: ai.phone,
      source: "AI",
      notes: ai.notes,
    },
  });
  return {
    ...base,
    email: saved.email,
    url: saved.url,
    phone: saved.phone,
    source: "AI",
    notes: saved.notes,
  };
}
