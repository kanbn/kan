ARG NODE_VERSION=20
ARG APP_DIRNAME=web
ARG PROJECT=@kan/web

# 1. Alpine image with build tools
FROM node:${NODE_VERSION}-alpine AS alpine
RUN apk update && \
    apk add --no-cache libc6-compat python3 make g++

# Setup pnpm and turbo on the alpine base
FROM alpine AS base
RUN corepack enable && \
    npm install turbo@2.3.1 dotenv-cli --global && \
    pnpm config set store-dir ~/.pnpm-store
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# 2. Prune projects
FROM base AS pruner
ARG PROJECT
ARG APP_DIRNAME

WORKDIR /app

# Copy only necessary files for pruning to reduce context size
COPY . .

# Generate a partial monorepo with a pruned lockfile for a target workspace.
# Include @kan/db for the migration command later.
RUN turbo prune --scope=${PROJECT} --scope=@kan/db --docker

# 3. Build the project
FROM base AS builder
ARG PROJECT

# Environment to skip .env validation on build
ENV CI=true

WORKDIR /app

# Copy lockfile and package.json's of isolated subworkspace
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=pruner /app/out/json/ .

# First install the dependencies (as they change less often)
# Use a cache for pnpm store for faster builds on subsequent runs
RUN --mount=type=cache,id=pnpm,target=~/.pnpm-store pnpm install --frozen-lockfile

# Copy source code of isolated subworkspace
COPY --from=pruner /app/out/full/ .

# Build only the web application
RUN pnpm build --filter=${PROJECT}

# 4. Production pruner
FROM builder AS productionpruner

WORKDIR /app

# Generate a partial monorepo with a pruned lockfile for a target workspace.
# Include @kan/db for the migration command later.
RUN turbo prune --scope=@kan/db --docker

# 5. Productionn db builder
FROM productionpruner AS productiondbbuilder

WORKDIR /app/out/full

RUN pnpm install

# 6. Final image - runner stage to run the application
FROM base AS runner
ARG APP_DIRNAME

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

WORKDIR /app

ENV NODE_ENV=production

# Copy only the necessary files for the Next.js application to run
# This includes .next/, public/, and package.json from the web app
# And the shared packages/node_modules that the web app depends on
COPY --chown=nextjs:nodejs --from=builder /app/apps/${APP_DIRNAME}/.next/ ./apps/${APP_DIRNAME}/.next/
COPY --chown=nextjs:nodejs --from=builder /app/apps/${APP_DIRNAME}/public/ ./apps/${APP_DIRNAME}/public/
COPY --chown=nextjs:nodejs --from=builder /app/apps/${APP_DIRNAME}/package.json ./apps/${APP_DIRNAME}/package.json
COPY --chown=nextjs:nodejs ./apps/${APP_DIRNAME}/entrypoint.sh /app/apps/${APP_DIRNAME}/entrypoint.sh

RUN chmod +x /app/apps/${APP_DIRNAME}/entrypoint.sh

# Copy all node_modules from the production-pruner stage. This is crucial for only having
# the necessary modules for the runner.
COPY --chown=nextjs:nodejs --from=productiondbbuilder /app/out/full/node_modules/ ./node_modules/
COPY --chown=nextjs:nodejs --from=productiondbbuilder /app/out/full/package.json ./package.json


# Copy the db package
COPY --chown=nextjs:nodejs --from=productionpruner /app/out/full/packages/db/ ./packages/db/

WORKDIR /app/apps/${APP_DIRNAME}

ARG PORT=3000
ENV PORT=${PORT}
EXPOSE ${PORT}

CMD ["./entrypoint.sh"]