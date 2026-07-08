# Railway build via Dockerfile — a plain, standard Linux npm install that
# reliably resolves Tailwind v4's native @tailwindcss/oxide binary. (Railway's
# default Nixpacks builder installed in a non-standard production mode that
# dropped the optional native binary, breaking `next build`.)
FROM node:22-bookworm-slim

# Prisma's query engine needs OpenSSL at runtime.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first for better layer caching. Copy the Prisma schema
# too, so the postinstall `prisma generate` hook can find it during install.
COPY package.json ./
COPY prisma ./prisma
RUN npm install --include=optional --include=dev --no-audit --no-fund

# Copy the rest of the source and build (runs `prisma generate && next build`).
COPY . .
RUN npm run build

ENV NODE_ENV=production
# Railway sets PORT; `next start` binds to it automatically.
EXPOSE 3000
CMD ["npm", "run", "start"]
