import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { extractFromImages, isMockMode } from "@/lib/extraction";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateImageFile } from "@/lib/storage";

export const maxDuration = 60;

const EXTRACT_LIMIT = 10; // calls
const EXTRACT_WINDOW_MS = 60_000; // per minute per user

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = checkRateLimit(
    `extract:${session.user.id}`,
    EXTRACT_LIMIT,
    EXTRACT_WINDOW_MS
  );
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Too many extractions — try again in ${limit.retryAfterSeconds}s` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const formData = await request.formData();
  const files = formData.getAll("images") as unknown as File[];
  const images: { mimeType: string; base64: string }[] = [];

  for (const file of files) {
    if (!(file instanceof File) || file.size === 0) continue;
    const problem = validateImageFile(file);
    if (problem) {
      return NextResponse.json({ error: problem }, { status: 400 });
    }
    images.push({
      mimeType: file.type,
      base64: Buffer.from(await file.arrayBuffer()).toString("base64"),
    });
  }

  if (images.length === 0) {
    return NextResponse.json(
      { error: "Attach at least one photo" },
      { status: 400 }
    );
  }

  try {
    const result = await extractFromImages(images.slice(0, 4));
    return NextResponse.json({ result, mock: isMockMode() });
  } catch (e) {
    console.error("Extraction failed:", e);
    return NextResponse.json(
      { error: "Extraction failed — you can still fill in the details manually" },
      { status: 502 }
    );
  }
}
