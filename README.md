# Product Warranty & Serial Vault

Receipts, serial numbers and warranty deadlines in one place. See
[PRD.md](./PRD.md) for the full product spec.

Two clients, one backend:

- **`mobile/`** — native mobile app (Expo / React Native) for iPhone & Android.
- **Root** — the Next.js app: serves the REST API + auth for the mobile app,
  and doubles as an installable web (PWA) version.

## Stack

Next.js (App Router, TS) · Tailwind CSS v4 · Prisma + SQLite · better-auth ·
Anthropic Claude vision extraction · pdf-lib claim packages · Expo SDK 57.

## Run the mobile app (Expo Go)

1. Install the **Expo Go** app on your phone (App Store / Play Store).
2. Start the backend so your phone can reach it:
   ```bash
   node node_modules/next/dist/bin/next dev -H 0.0.0.0
   ```
3. In a second terminal, start the mobile app:
   ```bash
   cd mobile
   node node_modules/expo/bin/cli start
   ```
4. Scan the QR code with your phone (same Wi-Fi as the PC). The app finds the
   backend automatically via the Metro host; for a deployed backend set
   `EXPO_PUBLIC_API_URL` in `mobile/.env`.

If the phone can't connect, allow Node.js through Windows Firewall
(ports 3000 and 8081, Private networks).

To produce installable binaries (APK / App Store), use
[EAS Build](https://docs.expo.dev/build/introduction/):
`node node_modules/expo/bin/cli install eas-cli` then `eas build`.
Android APKs can be side-loaded directly; iOS distribution requires an Apple
Developer account.

## Setup

```bash
npm install
cp .env.example .env    # then fill in values (see below)
npm run db:push         # creates dev.db
npm run dev
```

`.env` values:

- `BETTER_AUTH_SECRET` — any long random string.
- `ANTHROPIC_API_KEY` — your Anthropic key. **Leave empty to run in demo
  mode**: the extract endpoint returns realistic sample data so the whole
  flow works without a key.
- `ANTHROPIC_MODEL` — defaults to `claude-sonnet-5`.

> Windows note: if the project path contains `&`, `npx`/`npm run` shims can
> fail. Call CLIs directly instead, e.g.
> `node node_modules/prisma/build/index.js db push` and
> `node node_modules/next/dist/bin/next dev`.

## Using it on your phone

Run the dev server with `-H 0.0.0.0`, open `http://<your-pc-ip>:3000` on the
phone (same Wi-Fi), then "Add to Home screen". For real deployments use
Vercel/fly.io with Postgres + object storage (see PRD §7).

## Key paths

- `app/(app)/` — authenticated pages (dashboard, vault, notifications, settings)
- `app/actions/` — server actions (items, claims, settings)
- `app/api/extract` — AI extraction (rate-limited, mock-mode fallback)
- `app/api/files/[assetId]` — authenticated image serving (uploads are private, never in `public/`)
- `app/api/items/[id]/claim-package` — PDF claim package
- `lib/extraction.ts` — Claude vision call w/ forced tool-use JSON + Zod validation
- `storage/uploads/` — private upload storage (gitignored)
