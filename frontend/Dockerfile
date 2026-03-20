FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY frontend/package.json frontend/

RUN pnpm install --frozen-lockfile

COPY packages/shared/ packages/shared/
COPY frontend/ frontend/

WORKDIR /app/frontend

EXPOSE 3000

CMD ["pnpm", "dev", "--host", "0.0.0.0", "--port", "3000"]
