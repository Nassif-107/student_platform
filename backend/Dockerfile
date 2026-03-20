FROM node:20-alpine

RUN mkdir -p /app/uploads && chown -R node:node /app
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --chown=node:node pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY --chown=node:node packages/shared/package.json packages/shared/
COPY --chown=node:node backend/package.json backend/

RUN pnpm install --frozen-lockfile

COPY --chown=node:node packages/shared/ packages/shared/
COPY --chown=node:node backend/ backend/

USER node
WORKDIR /app/backend

EXPOSE 3001

CMD ["pnpm", "dev"]
