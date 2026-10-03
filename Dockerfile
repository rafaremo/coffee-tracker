# syntax=docker/dockerfile:1
FROM node:20-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_URL=file:./data/prod.db

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 remix

RUN mkdir -p /app/data && chown remix:nodejs /app/data

COPY --from=builder --chown=remix:nodejs /app/build ./build
COPY --from=builder --chown=remix:nodejs /app/package.json ./package.json
COPY --from=builder --chown=remix:nodejs /app/prisma ./prisma
COPY --from=builder --chown=remix:nodejs /app/node_modules ./node_modules

USER remix

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD npx prisma migrate deploy && npx prisma db seed && npm start
