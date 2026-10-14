# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
RUN apk add --no-cache openssl libc6-compat
ENV PNPM_HOME=/pnpm
ENV PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/api-client/package.json packages/api-client/
COPY packages/validation/package.json packages/validation/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @football/api exec prisma generate
RUN pnpm --filter @football/api build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app ./
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node prisma/seed.js && node dist/main.js"]
