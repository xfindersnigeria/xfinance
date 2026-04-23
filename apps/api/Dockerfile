# ─── Stage 1: builder ────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

# bcrypt needs node-gyp → python3 + make + g++
RUN apk add --no-cache python3 make g++

# Prevent puppeteer from downloading Chromium during npm ci
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Generate Prisma client before building
RUN npx prisma generate

RUN npm run build

# Debug: verify main.js was produced at the expected path
RUN ls dist/src/main.js


# ─── Stage 2: production ─────────────────────────────────────────────────────
FROM node:24-slim AS production

RUN apt-get update && apt-get install -y \
    chromium \
    curl \
    fonts-freefont-ttf \
    fonts-noto-color-emoji \
    libnspr4 \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Tell puppeteer where the system Chromium lives and skip its own download
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    NODE_ENV=production

WORKDIR /app

# Only copy what the running app needs
COPY --from=builder /app/dist              ./dist
COPY --from=builder /app/node_modules      ./node_modules
COPY --from=builder /app/prisma            ./prisma
COPY --from=builder /app/prisma.config.ts  ./prisma.config.ts
COPY --from=builder /app/package.json      ./package.json
COPY --from=builder /app/seeders           ./seeders
COPY --from=builder /app/tsconfig.json     ./tsconfig.json
COPY --from=builder /app/tsconfig.build.json ./tsconfig.build.json

EXPOSE 3000

# Run migrations then start the app
# CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
CMD ["sh", "-c", "node dist/src/main"]

# CMD ["sh", "-c", "npx prisma migrate deploy || echo 'migrate failed'; node dist/src/main"]
