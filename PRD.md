# PRD — Product Warranty & Serial Vault

**Version:** 1.0 · **Date:** 2026-07-07 · **Status:** Approved for build
**Owner:** Ashley (ashley_d_87@hotmail.com)

---

## 1. Overview

Product Warranty & Serial Vault solves a common household headache: managing physical receipts, tracking hidden serial numbers, and navigating the warranty claim process.

**Core loop:** The user photographs a receipt and/or a product's serial sticker → AI vision extracts the metadata (brand, model, serial, purchase date, price, store, warranty duration) → the user reviews and confirms the extracted data → the vault stores everything, counts down to warranty expiry, reminds the user before it lapses, and produces a one-click PDF "Claim Package" when a product breaks.

### Platform decision: native mobile app + shared backend *(amended 2026-07-07)*

Per stakeholder direction, the product is a **native mobile app** (Expo / React Native, one codebase for iPhone & Android) backed by the Next.js server:

- `mobile/` — the native app: camera-first capture, native navigation (bottom tabs), secure token storage, share-sheet exports. Runs instantly on a real phone via Expo Go; distributed as APK / App Store builds via EAS.
- Next.js backend — auth (better-auth + Expo plugin), REST API (`/api/*`), AI extraction, private file storage, PDF/CSV generation. The same server also serves a web (PWA) version of the app for desktop/browser use.
- v2: push notifications via the native wrapper (`expo-notifications`).

---

## 2. Goals & Non-Goals

### Goals (v1)
1. Add a product with photos in under 60 seconds, with AI doing the data entry.
2. Never miss a warranty deadline: visible countdowns + in-app reminders at a configurable lead time.
3. One-click, professional PDF Claim Package containing everything a manufacturer asks for.
4. Act as the household's serial-number registry (insurance / theft documentation via CSV export).

### Non-Goals (v1 — documented for v2)
- Email receipt auto-import (Gmail/Outlook scanning) — strongest differentiator in competitor reviews, but complex; v2.
- Household / family sharing and multi-user vaults — v2.
- Client-side barcode scanning (ZXing) for serials — v2.
- Push/email notifications — v1 ships in-app notifications only.
- Native app store distribution — v2 via PWA wrapper.

---

## 3. Target User & Stories

Primary persona: a household "keeper of the receipts" managing 10–100 products (appliances, electronics, tools).

| # | Story | Priority |
|---|-------|----------|
| U1 | As a user, I can sign up / log in with email + password so my vault is private. | P0 |
| U2 | As a user, I can photograph a receipt and/or serial sticker and have the details extracted for me. | P0 |
| U3 | As a user, I can **review and correct** every AI-extracted field before saving — the AI is an assistant, not an authority. | P0 |
| U4 | As a user, I can add or edit an item fully manually with no photos at all. | P0 |
| U5 | As a user, I see a dashboard: total items, total protected value, expiring soon, expired, items missing a receipt or serial. | P0 |
| U6 | As a user, I can search and filter my vault (text, category, status, expiring window). | P0 |
| U7 | As a user, I get in-app notifications before a warranty expires, at a lead time I choose. | P0 |
| U8 | As a user, I can open a claim on a broken product and track it (Draft → Submitted → Approved/Denied → Resolved). | P0 |
| U9 | As a user, I can export a one-click PDF Claim Package (product details + receipt + serial images). | P0 |
| U10 | As a user, I can export my whole inventory as CSV for insurance documentation. | P1 |
| U11 | As a user, I can attach extra images/documents to an item (warranty card, product photo, manual). | P1 |
| U12 | As a user, I can install the app to my phone's home screen. | P1 |

---

## 4. Feature Requirements

### F1 — Authentication
- Email + password via **better-auth** (maintained library; argon2/scrypt hashing, secure httpOnly session cookies). No hand-rolled password handling.
- Signup, login, logout; all vault routes require a session; middleware redirects anonymous users to `/login`.

### F2 — Smart Upload & AI Extraction
- Upload interface accepts receipt and/or serial-sticker photos (camera or gallery), plus optional extra assets.
- Client-side image downscale/compression before upload (max ~1600px, JPEG) — faster on mobile data, cheaper AI calls.
- `/api/extract` sends the images to the **Anthropic Claude API** (`claude-sonnet-5` by default, configurable via `ANTHROPIC_MODEL`) using **forced tool-use so the response is schema-constrained JSON**, then validates with Zod. No "please return JSON" prompt-and-pray.
- **Mock mode:** if `ANTHROPIC_API_KEY` is absent, the endpoint returns realistic mock data so the app is fully demoable.
- Extraction response schema:

```json
{
  "brand": "string | null",
  "modelName": "string | null",
  "serialNumber": "string | null",
  "purchaseDate": "YYYY-MM-DD | null",
  "storeName": "string | null",
  "purchasePrice": "number | null",
  "currency": "ISO 4217 string | null",
  "suggestedCategory": "APPLIANCE | ELECTRONICS | FURNITURE | TOOL | JEWELRY | VEHICLE | SPORTS | OTHER | null",
  "estimatedWarrantyMonths": "integer | null",
  "warrantyAssumed": "boolean — true when no explicit warranty info was visible",
  "confidence": { "<field>": "high | medium | low" }
}
```

- `estimatedWarrantyMonths` is **null when unknown**; the UI suggests 12 months but visibly labels it *assumed* — the app never silently invents a warranty date.
- Low-confidence fields are visually flagged in the review form.
- Rate limiting on `/api/extract` (per-user, sliding window) for cost/abuse control.

### F3 — Review & Save (the trust step)
- Extraction pre-fills an editable form: brand, model, category, serial, purchase date, price + currency, store, warranty type/provider/duration, notes.
- Warranty expiration date is computed from purchase date + duration, shown live, and manually overridable.
- Saving creates the `ProductItem` and links uploaded images as `Asset` records.

### F4 — Vault (inventory)
- List with search (brand/model/serial/store), filters (category, status, "expiring in 90 days"), sort (expiry soonest, newest, price).
- Item detail: photos, all fields, warranty countdown (days remaining / % elapsed), claims history, actions (edit, add asset, open claim, export PDF, delete with confirmation).
- **Status is derived at read time** from dates — `ACTIVE`, `EXPIRING_SOON` (≤ lead window), `EXPIRED` — never stored stale. Only user-driven states are stored: an item with an open claim shows `CLAIM IN PROGRESS`; `ARCHIVED` hides an item from active views.

### F5 — Warranty types
- `warrantyType`: `MANUFACTURER` (default), `RETAILER`, `EXTENDED`, `CREDIT_CARD`, `OTHER`.
- `warrantyProvider` free text (who to claim against — not always the brand).

### F6 — Reminders & Notifications (in-app)
- User setting: reminder lead time (7 / 14 / 30 / 60 / 90 days; default 30).
- Notification records are generated when a warranty enters the lead window or expires (evaluated on app load — no cron needed in v1) and surface in a bell menu + `/notifications` page with unread badges.
- Email notifications: v2.

### F7 — Claims
- `Claim` entity per product: status (`DRAFT`, `SUBMITTED`, `IN_REVIEW`, `APPROVED`, `DENIED`, `RESOLVED`), claim number, provider contact, issue description, dates, resolution notes.
- Full history retained; multiple claims per product allowed.

### F8 — Claim Package (PDF) & Exports
- One click on an item → server-generated PDF: cover page (product, purchase, serial, warranty, claim details if any) + embedded receipt and serial images. Built with `pdf-lib`.
- `/api/export/csv` → full inventory CSV (all fields incl. serials) for insurance records.

### F9 — Dashboard
- Stat cards: total items, total protected value (sum of active-warranty purchase prices), expiring ≤ 90 days, expired.
- "Needs attention" list: expiring soonest first; items missing receipt or serial flagged.

### F10 — PWA & Mobile Shell
- Web app manifest (standalone display, theme color, icons), installable on Android/iOS.
- Bottom tab bar on mobile (Dashboard, Vault, Add, Notifications, Settings); sidebar on desktop.
- Touch-first: 44px targets, camera-first upload flow.

---

## 5. Data Model (Prisma)

```
User          id, name, email (unique), emailVerified, image?, createdAt, updatedAt
              → better-auth companion tables: Session, Account (holds password hash), Verification

UserSettings  userId (unique FK), reminderLeadDays (default 30), currency (default "USD")

ProductItem   id, userId (FK, indexed), brand, modelName, category (enum),
              serialNumber?, purchaseDate?, purchasePrice? (Decimal), currency,
              storeName?, warrantyType (enum), warrantyProvider?,
              warrantyDurationMonths?, warrantyExpirationDate? (indexed),
              warrantyAssumed (bool), notes?, archived (bool),
              createdAt, updatedAt

Asset         id, productItemId (FK), type (RECEIPT | SERIAL_STICKER | WARRANTY_CARD |
              PRODUCT_PHOTO | MANUAL | OTHER), fileKey, fileName, mimeType, sizeBytes, createdAt

Claim         id, productItemId (FK), status (enum), claimNumber?, providerContact?,
              issueDescription, submittedAt?, resolvedAt?, resolutionNotes?, createdAt, updatedAt

Notification  id, userId (FK, indexed), productItemId? (FK), type (EXPIRING_SOON | EXPIRED |
              CLAIM_UPDATE), title, body, readAt?, createdAt
              @@unique(userId, productItemId, type) — no duplicate reminders
```

Notes: prices are `Decimal`, never float. `warrantyExpirationDate` is stored (computed on create/edit from purchase date + months, or set manually) and indexed for expiry queries; display status is always derived from it at read time.

## 6. Security & Storage

- **Uploads are private.** Files live outside `public/` (`./storage/uploads/<userId>/…` in dev; S3/Supabase Storage with signed URLs in production) and are served only through an authenticated route (`/api/files/[assetId]`) that checks ownership.
- Upload validation: images only (JPEG/PNG/WebP/HEIC), 10 MB cap, sanitized generated file keys.
- All queries scoped by `userId` from the server session; no client-supplied user IDs.
- Secrets in `.env` (never committed); `.env.example` provided.

## 7. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router, TypeScript, Server Actions + route handlers) |
| UI | Tailwind CSS v4, shadcn-style components (Radix primitives), Lucide icons, sonner toasts |
| Auth | better-auth (email + password, Prisma adapter) |
| DB/ORM | Prisma + SQLite (dev); Postgres (Supabase/Neon) as the documented production swap |
| AI | Anthropic Claude API — `claude-sonnet-5` vision, forced tool-use JSON + Zod validation; mock mode without key |
| Files | Private local disk (dev) → S3/Supabase Storage (prod) |
| PDF | pdf-lib |
| Validation | Zod (shared client/server) |

**Production path:** deploy to Vercel/fly.io, switch `datasource` to Postgres, move file storage to a bucket, add email notifications. The code isolates storage and DB behind small modules to keep that swap contained.

## 8. Success Metrics

- Time-to-add-item (photo → saved) under 60s.
- ≥ 90% of extraction fields accepted without manual correction on clear receipts.
- Zero unauthenticated access to stored images (verified by test).
- Lighthouse PWA installability pass; mobile usability at 375px width.

## 9. v2 Roadmap

1. Email receipt auto-import (forwarding address and/or mailbox integration).
2. Email + push notifications (needs scheduled jobs / native wrapper).
3. Household sharing (vault members, roles).
4. Barcode/QR scanning for instant serial capture.
5. Warranty-length knowledge base by brand/category (auto-suggest beyond the receipt).
6. Native wrapper via Expo/Capacitor for store distribution.
