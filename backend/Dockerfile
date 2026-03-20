FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY backend/package.json backend/

RUN pnpm install --frozen-lockfile

COPY packages/shared/ packages/shared/
COPY backend/ backend/
COPY .env .env 2>/dev/null || true

WORKDIR /app/backend

EXPOSE 3001

CMD ["pnpm", "dev"]
