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

ENV VITE_API_TARGET=http://backend:3001

EXPOSE 3000

CMD ["pnpm", "dev"]
