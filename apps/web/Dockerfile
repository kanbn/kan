# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=20
ARG DISTROLESS_NODE_IMAGE=gcr.io/distroless/nodejs${NODE_VERSION}-debian12

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

RUN apk add --no-cache git

WORKDIR /app
COPY . .

# Generate version from git (fallback if APP_VERSION not provided)
RUN git fetch --tags --unshallow 2>/dev/null || git fetch --tags 2>/dev/null || true && \
    AUTO_VERSION=$(git describe --tags --always --long 2>/dev/null | \
    sed -E 's/^v?([0-9]+\.[0-9]+\.[0-9]+)-[0-9]+-g([a-f0-9]{7}).*/\1+\2/' | \
    sed 's/^v//' || \
    git rev-parse --short HEAD 2>/dev/null | head -c 7 || \
    echo "unknown") && \
    echo "$AUTO_VERSION" > /app/AUTO_VERSION

RUN turbo prune --scope=@kan/web --scope=@kan/db --docker

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
# Stage 4: Build the web application
# ============================================
FROM alpine AS builder
ARG APP_VERSION

WORKDIR /app

COPY --from=deps /app/ ./
COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/AUTO_VERSION /tmp/AUTO_VERSION

# Force standalone output for production Docker image
ENV NEXT_PUBLIC_USE_STANDALONE_OUTPUT=true
ENV CI=true

RUN VERSION="${APP_VERSION:-$(cat /tmp/AUTO_VERSION 2>/dev/null | tr -d '\n\r' || echo 'unknown')}" && \
    NEXT_PUBLIC_APP_VERSION="$VERSION" pnpm build --filter=@kan/web

# ============================================
# Stage 5: Migration image (run-once container)
# Note: Use a Debian-based Node image instead of Alpine here because
# Alpine under QEMU has caused Illegal instruction (signal 4) crashes
# during npm installs on arm64 multi-arch builds.
# ============================================
FROM node:${NODE_VERSION}-bullseye-slim AS migrate
WORKDIR /db

COPY packages/db/drizzle.config.ts ./drizzle.config.ts
COPY packages/db/migrations/ ./migrations/

RUN npm init -y && \
    npm install drizzle-kit drizzle-orm pg --save-exact && \
    # Strip unnecessary files from node_modules
    find node_modules -type f \( \
      -name '*.d.ts' -o \
      -name '*.d.mts' -o \
      -name '*.d.cts' -o \
      -name '*.map' -o \
      -name '*.md' -o \
      -name '*.txt' -o \
      -name 'LICENSE*' -o \
      -name 'CHANGELOG*' -o \
      -name 'README*' -o \
      -name '.eslint*' -o \
      -name '.prettier*' -o \
      -name 'tsconfig*.json' \
    \) -delete && \
    find node_modules -type d -empty -delete && \
    rm -rf /root/.npm /tmp/*

CMD ["npx", "drizzle-kit", "migrate"]

# ============================================
# Stage 6: Production web image (distroless)
# ============================================
FROM ${DISTROLESS_NODE_IMAGE} AS web
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copy the standalone Next.js server
COPY --from=builder /app/apps/web/.next/standalone/ ./
# Copy static assets and public files
COPY --from=builder /app/apps/web/.next/static/ ./apps/web/.next/static/
COPY --from=builder /app/apps/web/public/ ./apps/web/public/

# Copy bootstrap script for runtime env var injection
COPY apps/web/bootstrap.cjs ./bootstrap.cjs

EXPOSE 3000
CMD ["bootstrap.cjs"]
