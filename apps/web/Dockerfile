# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=20
ARG DISTROLESS_NODE_IMAGE=gcr.io/distroless/nodejs${NODE_VERSION}-debian12

# ============================================
# Stage 1: Alpine base with pnpm and turbo
# ============================================
# Pinned to $BUILDPLATFORM so the JS toolchain never runs under QEMU. Every
# stage derived from `alpine` (pruner, deps, builder) is therefore native, and
# only the final per-arch stages pay emulation. See .github/docker-build-performance.md.
FROM --platform=$BUILDPLATFORM node:${NODE_VERSION}-alpine AS alpine

# Absolute path: BuildKit does not expand `~` in cache mount targets, so the
# store dir and the mount target must both be literal for the mount to work.
ENV PNPM_STORE=/pnpm/store

RUN apk update && \
    apk add --no-cache libc6-compat && \
    rm -rf /var/cache/apk/* /tmp/* || true && \
    corepack enable && \
    corepack prepare pnpm@9.14.2 --activate && \
    npm install turbo@2.3.1 --global && \
    pnpm config set store-dir "$PNPM_STORE"

# ============================================
# Stage 2: Prune the monorepo
# ============================================
FROM alpine AS pruner

WORKDIR /app
COPY . .

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
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile

# ============================================
# Stage 4: Build the web application
# ============================================
FROM alpine AS builder
# Empty default: an unstamped build hides the version row rather than linking
# to a release tag that does not exist.
ARG APP_VERSION=""

WORKDIR /app

COPY --from=deps /app/ ./
COPY --from=pruner /app/out/full/ .

# Force standalone output for production Docker image
ENV NEXT_PUBLIC_USE_STANDALONE_OUTPUT=true
ENV CI=true

RUN --mount=type=cache,id=next-cache,target=/app/apps/web/.next/cache,sharing=locked \
    --mount=type=cache,id=turbo-cache,target=/app/.turbo,sharing=locked \
    NEXT_PUBLIC_APP_VERSION="$APP_VERSION" pnpm build --filter=@kan/web

# ============================================
# Stage 5: Migration image (run-once container)
# ============================================
# Deliberately not pinned to $BUILDPLATFORM: drizzle-kit pulls esbuild, which
# resolves a prebuilt binary per platform. Cross-compiling would put
# @esbuild/linux-x64 in the arm64 image.
FROM node:${NODE_VERSION}-alpine AS migrate
WORKDIR /db

COPY packages/db/drizzle.config.ts ./drizzle.config.ts
COPY packages/db/migrations/ ./migrations/

RUN --mount=type=cache,id=npm-cache,target=/root/.npm,sharing=locked \
    npm init -y && \
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
    rm -rf /tmp/*

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
COPY --chown=1000:1000 --from=builder /app/apps/web/.next/standalone/ ./
# Copy static assets and public files
COPY --chown=1000:1000 --from=builder /app/apps/web/.next/static/ ./apps/web/.next/static/
COPY --chown=1000:1000 --from=builder /app/apps/web/public/ ./apps/web/public/

# Copy bootstrap script for runtime env var injection
COPY --chown=1000:1000 apps/web/bootstrap.cjs ./bootstrap.cjs

USER 1000:1000

EXPOSE 3000
CMD ["bootstrap.cjs"]
