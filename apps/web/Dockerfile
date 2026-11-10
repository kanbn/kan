# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=24
ARG DISTROLESS_NODE_IMAGE=gcr.io/distroless/nodejs${NODE_VERSION}-debian13

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
# Scoped to web alone: apps/api gets its own prune/deps pair below so its
# image doesn't carry web's node_modules (Next.js, Tiptap, Stripe UI, etc).
FROM alpine AS pruner

WORKDIR /app
COPY . .

RUN turbo prune --scope=@kan/web --scope=@kan/db --docker

# ============================================
# Stage 2b: Prune the monorepo for the api image
# ============================================
FROM alpine AS pruner-api

WORKDIR /app
COPY . .

RUN turbo prune --scope=@kan/api-server --scope=@kan/db --docker

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
# Stage 3b: Install dependencies for the api image
# ============================================
# --prod: apps/api has no dist build (see Stage 7) and runs its TS source
# directly via @swc-node/register at container boot, so that loader,
# @swc/core and @kan/tsconfig (for the tsconfig.json it reads at startup)
# are real `dependencies`, not devDependencies — they survive --prod.
FROM alpine AS deps-api
WORKDIR /app

COPY --from=pruner-api /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner-api /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=pruner-api /app/out/json/ .

ENV CI=true
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile --prod && \
    # --prod doesn't exclude workspace-linked devDependencies, so
    # @kan/eslint-config/@kan/prettier-config still install, pulling in
    # eslint/typescript-eslint/babel/playwright-core as real deps — none
    # imported by apps/api (plain `prettier` stays: @react-email/render, a
    # real dep via @kan/email, needs it at runtime). better-auth's Next.js
    # integration is an unused optional peer that still pulls in next, its
    # per-platform @next/swc binaries, and sharp.
    rm -rf node_modules/next node_modules/@next node_modules/sharp node_modules/@img \
           node_modules/eslint node_modules/@eslint-community \
           node_modules/typescript-eslint node_modules/@typescript-eslint \
           node_modules/@kan/eslint-config node_modules/@kan/prettier-config \
           node_modules/prettier-plugin-tailwindcss \
           node_modules/@ianvs node_modules/@babel \
           node_modules/playwright-core node_modules/es-abstract \
           node_modules/turbo-linux-64 node_modules/turbo-linux-arm64

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
# Copy the migrate stage so bootstrap.cjs can run migrations (RUN_MIGRATIONS=true)
COPY --chown=1000:1000 --from=migrate /db/ ./migrate/

USER 1000:1000

EXPOSE 3000
CMD ["bootstrap.cjs"]

# ============================================
# Stage 7: Production api image
# ============================================
# ponytail: runs TS source through the same swc-node loader as `pnpm dev`/`pnpm
# start` instead of a precompiled dist/ — apps/api's own tsc build is a
# type-check-only no-op (see apps/api/package.json), since the workspace's
# other packages aren't written for strict Node16 module resolution. A real
# bundled build is a later optimization, not a correctness requirement.
FROM alpine AS api
WORKDIR /app

ENV NODE_ENV=production
ENV API_PORT=4000

COPY --chown=node:node --from=deps-api /app/ ./
COPY --chown=node:node --from=pruner-api /app/out/full/ .

USER node
WORKDIR /app/apps/api

EXPOSE 4000
CMD ["node", "--import", "@swc-node/register/esm-register", "src/main.ts"]
