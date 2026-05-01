# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=20

# ============================================
# Stage 1: Alpine base with pnpm and turbo
# ============================================
FROM node:${NODE_VERSION}-alpine AS alpine
RUN apk update && \
    apk add --no-cache libc6-compat && \
    rm -rf /var/cache/apk/* /tmp/* || true && \
    corepack enable && \
    npm install turbo@2.3.1 --global && \
    pnpm config set store-dir ~/.pnpm-store

# ============================================
# Stage 2: Prune the monorepo
# ============================================
FROM alpine AS pruner

WORKDIR /app
COPY . .
RUN turbo prune --scope=@kan/websocket --docker

# ============================================
# Stage 3: Install dependencies
# ============================================
FROM alpine AS deps
WORKDIR /app

COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=pruner /app/out/json/ .

ENV CI=true
RUN --mount=type=cache,id=pnpm,target=~/.pnpm-store pnpm install --frozen-lockfile

# ============================================
# Stage 4: Build the websocket server
# ============================================
FROM alpine AS builder
WORKDIR /app

COPY --from=deps /app/ ./
COPY --from=pruner /app/out/full/ .

ENV CI=true
RUN pnpm build --filter=@kan/websocket

# ============================================
# Stage 5: Production image
# ============================================
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3010
ENV WEBSOCKET_PORT=3010

RUN apk add --no-cache wget

# Copy built output
COPY --from=builder /app/apps/websocket/dist/ ./apps/websocket/dist/

# Drop privileges
USER node

EXPOSE 3010

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3010/health || exit 1

CMD ["node", "apps/websocket/dist/index.js"]
