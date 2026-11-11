# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app

# Dependencies (lockfile + workspace settings + local patches).
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile

# Production build. Jellyfin credentials are read at runtime, so no .env here.
FROM deps AS build
COPY . .
RUN pnpm build

# Runtime: adapter-node output is self-contained; package.json keeps ESM mode.
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3000
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/build ./build
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "build"]
