# syntax=docker/dockerfile:1

FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /app

# Manifest, lockfile and the locally patched dependency (referenced by pnpm-workspace.yaml).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY .dovenv/patches ./.dovenv/patches
RUN pnpm install --frozen-lockfile

# Credentials are runtime-only, so the build needs no .env.
COPY . .
RUN pnpm build

FROM node:24-alpine AS runtime
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/build ./build
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/api/health" >/dev/null || exit 1
CMD ["node", "build"]
