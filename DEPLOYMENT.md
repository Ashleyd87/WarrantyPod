# Deploying Warranty Vault (Railway)

Goal: run the backend 24/7 so your phone works anywhere — PC off, on cellular
data — and install the app as a normal standalone app.

Railway hosts everything in one place: the Next.js backend, a PostgreSQL
database, and the uploaded receipt/serial photos (on a persistent Volume). No
other service is needed for the backend. You'll also use a free **Expo (EAS)**
account to build the phone app.

All the code is prepared; you do the account/click steps. ~25–35 minutes.

---

## Part 1 — Deploy the backend + database on Railway

1. Put this project on GitHub (Railway deploys from a repo):
   ```bash
   git init && git add . && git commit -m "Warranty Vault"
   ```
   Create a repo at https://github.com/new and run its "push existing repo"
   lines. (`.env`, `storage/`, and `node_modules/` are gitignored — no secrets
   or local data are uploaded.)
2. Go to https://railway.app → **New Project** → **Deploy from GitHub repo** →
   pick your repo. Railway detects Next.js and starts building.
3. **Add the database.** In the project, click **New** → **Database** →
   **Add PostgreSQL**. Railway provisions it in a few seconds.
4. **Add a Volume for uploaded photos.** Click your **app** service → **Settings**
   → **Volumes** → **New Volume**. Set the mount path to **`/data`**. (Without a
   volume, uploaded images are wiped on every redeploy.)
5. **Set environment variables.** App service → **Variables** → add:

   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` — type it exactly; Railway links it to your Postgres |
   | `BETTER_AUTH_SECRET` | run `openssl rand -base64 32`, paste the result |
   | `BETTER_AUTH_URL` | leave blank for now (set in step 7) |
   | `UPLOAD_DIR` | `/data/uploads` |
   | `ANTHROPIC_API_KEY` | your Anthropic key (or leave blank for demo mode) |
   | `ANTHROPIC_MODEL` | `claude-sonnet-5` |

6. **Generate a public URL.** App service → **Settings** → **Networking** →
   **Generate Domain**. You'll get something like
   `https://warranty-vault-production.up.railway.app`.
7. Set **`BETTER_AUTH_URL`** to that exact URL (Variables tab). Railway redeploys
   automatically.

## Part 2 — Create the database tables

Railway's internal database host only works inside Railway, so run the schema
push from your PC against the **public** connection string:

1. Postgres service → **Connect** → copy the **Public Network** connection URL
   (host looks like `…proxy.rlwy.net:PORT`).
2. In the project root, create `.env` (copy from `.env.example`) and set
   `DATABASE_URL` to that public URL. Then run:
   ```bash
   node node_modules/prisma/build/index.js db push
   ```
   This creates all the tables. (Use the `node …` form — the `&` in the folder
   name breaks `npx`.)
3. Open your Railway URL in a browser — you should see the login screen. Sign up
   and add a product to confirm the database + photo storage work end-to-end.

## Part 3 — Build the phone app

1. Point the app at your backend: edit `mobile/eas.json` and replace
   `https://REPLACE-WITH-YOUR-APP.up.railway.app` (in both the `preview` and
   `production` profiles) with your Railway URL.
2. In the `mobile/` folder:
   ```bash
   npm install --legacy-peer-deps eas-cli
   node node_modules/eas-cli/bin/run login       # create / log in to Expo
   node node_modules/eas-cli/bin/run init        # links an EAS project id
   node node_modules/eas-cli/bin/run build --profile preview --platform android
   ```
3. EAS builds in the cloud (~10–15 min) and gives you a link. On your Android
   phone, open it and install the **APK** — a real app on your home screen, no
   PC or Expo Go needed.

**iPhone:** iOS can't side-load, so a standalone iOS build needs a paid Apple
Developer account ($99/yr). With one:
`… build --profile production --platform ios`, then install via TestFlight.
Until then, use the app on iPhone through **Expo Go** (scan the QR from
`expo start`) or the web app in Safari ("Add to Home Screen").

---

## Costs

- **Railway:** usage-based with a small monthly free credit. A low-traffic
  personal app (backend + Postgres + volume) is cents-to-a-few-dollars a month;
  the trial credit typically covers early use. Check your usage in the dashboard.
- **Expo EAS free tier:** limited monthly cloud builds — enough for occasional
  rebuilds.

## Updating later

Push to GitHub → Railway auto-redeploys the backend. For app changes, run the
EAS build again and reinstall, or ship JS-only changes instantly over-the-air
with `eas update` (no rebuild).

## Alternative: serverless host (no persistent disk)

If you ever move the backend to a serverless host (e.g. Vercel) where the disk
isn't persistent, set `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` /
`SUPABASE_STORAGE_BUCKET` instead of `UPLOAD_DIR` — the storage layer will use a
private Supabase Storage bucket automatically. On Railway you don't need this.
