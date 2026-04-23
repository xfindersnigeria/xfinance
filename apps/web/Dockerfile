# ─── Stage 1: deps ───────────────────────────────────────────────────────────
FROM node:24-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci


# ─── Stage 2: builder ────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time args — must be declared before npm run build
ARG API_URL=http://api:3000
ARG ENABLE_REWRITE=true
ENV API_URL=$API_URL
ENV ENABLE_REWRITE=$ENABLE_REWRITE

RUN npm run build


# ─── Stage 3: production ─────────────────────────────────────────────────────
FROM node:24-alpine AS production

ENV NODE_ENV=production \
    PORT=3001

WORKDIR /app

# standalone output is a self-contained server — copy only what it needs
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static     ./.next/static
COPY --from=builder /app/public           ./public

EXPOSE 3001

CMD ["node", "server.js"]
