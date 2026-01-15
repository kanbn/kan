ARG NODE_VERSION=20
ARG APP_DIRNAME=web
ARG PROJECT=@kan/web

# 1. Alpine image
FROM node:${NODE_VERSION}-alpine AS alpine
RUN apk update && \
    apk add --no-cache --virtual .build-deps libc6-compat python3 make g++ && \
    rm -rf /var/cache/apk/* /tmp/* || true

# Setup pnpm and turbo on the alpine base
FROM alpine AS base
RUN corepack enable
# Replace <your-major-version> with the major version installed in your repository. For example:
# RUN npm install turbo@2.1.3 --global
RUN npm install turbo@2.3.1 --global

RUN pnpm config set store-dir ~/.pnpm-store

# 2. Prune projects
FROM base AS pruner
ARG PROJECT

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

RUN turbo prune --scope=${PROJECT} --scope=@kan/db --docker
 
# 3. Build the project
FROM base AS builder
ARG PROJECT
ARG APP_VERSION

WORKDIR /app

COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/AUTO_VERSION /tmp/AUTO_VERSION

ENV CI=true

RUN --mount=type=cache,id=pnpm,target=~/.pnpm-store pnpm install --frozen-lockfile
 
COPY --from=pruner /app/out/full/ .

# Use provided APP_VERSION or auto-generated from pruner stage
RUN VERSION="${APP_VERSION:-$(cat /tmp/AUTO_VERSION 2>/dev/null | tr -d '\n\r' || echo 'unknown')}" && \
    NEXT_PUBLIC_APP_VERSION="$VERSION" pnpm build --filter=${PROJECT}

# # Copy static files to standalone directory
# RUN mkdir -p apps/web/.next/standalone/.next && \
# mv apps/web/public apps/web/.next/standalone/ && \
# mv apps/web/.next/static apps/web/.next/standalone/.next/

# 4. Final image - runner stage to run the application
FROM base AS runner
ARG APP_DIRNAME
 
# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

WORKDIR /app

ENV NODE_ENV=production

COPY --chown=nextjs:nodejs --from=builder /app/ ./
WORKDIR /app/apps/${APP_DIRNAME}

ARG PORT=3000
ENV PORT=${PORT}
EXPOSE ${PORT}

CMD ["sh", "-c", "if [ -n \"$POSTGRES_URL\" ]; then cd /app && pnpm db:migrate && cd /app/apps/web; fi && pnpm start"]
