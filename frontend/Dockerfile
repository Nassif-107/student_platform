FROM node:20-alpine

RUN mkdir -p /app && chown -R node:node /app
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --chown=node:node pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY --chown=node:node packages/shared/package.json packages/shared/
COPY --chown=node:node frontend/package.json frontend/

RUN pnpm install --frozen-lockfile

COPY --chown=node:node packages/shared/ packages/shared/
COPY --chown=node:node frontend/ frontend/

USER node
WORKDIR /app/frontend

EXPOSE 3000

CMD ["pnpm", "dev", "--host", "0.0.0.0", "--port", "3000"]
