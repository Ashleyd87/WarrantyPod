import { NextRequest, NextResponse } from "next/server";
import { getDeviceId, missingDevice } from "@/lib/device-auth";
import { extractFromInputs, isMockMode } from "@/lib/extraction";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateImageFile } from "@/lib/storage";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";

export const maxDuration = 60;

const EXTRACT_LIMIT = 10; // calls
const EXTRACT_WINDOW_MS = 60_000; // per minute per user

export async function POST(request: NextRequest) {
  const deviceId = getDeviceId(request);
  if (!deviceId) return missingDevice();

  const limit = checkRateLimit(
    `extract:${deviceId}`,
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

  // Email import: PDF order confirmations and .eml / plain-text emails.
  const documents = formData.getAll("documents") as unknown as File[];
  const pdfs: { base64: string }[] = [];
  let emailText: string | null = null;
  for (const file of documents) {
    if (!(file instanceof File) || file.size === 0) continue;
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `${file.name}: file is larger than 10 MB` },
        { status: 400 }
      );
    }
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (isPdf) {
      pdfs.push({
        base64: Buffer.from(await file.arrayBuffer()).toString("base64"),
      });
    } else {
      // Treat anything else (message/rfc822, text/plain, unknown) as email text.
      emailText = [emailText, await file.text()].filter(Boolean).join("\n\n");
    }
  }

  if (images.length === 0 && pdfs.length === 0 && !emailText) {
    return NextResponse.json(
      { error: "Attach at least one photo or document" },
      { status: 400 }
    );
  }

  try {
    const result = await extractFromInputs({
      images: images.slice(0, 4),
      pdfs: pdfs.slice(0, 2),
      emailText,
    });
    return NextResponse.json({ result, mock: isMockMode() });
  } catch (e) {
    console.error("Extraction failed:", e);
    return NextResponse.json(
      { error: "Extraction failed — you can still fill in the details manually" },
      { status: 502 }
    );
  }
}
