# Multi-Stage Dockerfile for Self-Hosted AI Virtual Assistant
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# 1. Install dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# 2. Build Next.js application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# 3. Production runner image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Non-root system group and user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Create persistent storage directory
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# Copy built application and dependencies
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src ./src

USER nextjs

EXPOSE 3000

CMD ["npm", "run", "start"]
