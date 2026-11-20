# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS node-base
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# Git checkouts may use restrictive permissions (for example umask 077).
# The runtime user must own copied sources even when files are mode 0600.
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node backend/package.json backend/package.json
COPY --chown=node:node frontend/package.json frontend/package.json

FROM node-base AS api
# Keep the locked Prisma CLI available for the one-shot migration service.
RUN npm ci --workspace backend --include-workspace-root --include=dev
COPY --chown=node:node backend/prisma backend/prisma
RUN npm run db:generate --workspace backend
COPY --chown=node:node backend/src backend/src
ENV NODE_ENV=production \
    PORT=3000 \
    CHECKPOINT_DISABLE=1
USER node
EXPOSE 3000
CMD ["node", "backend/src/server.js"]

FROM node-base AS frontend-build
RUN npm ci --workspace frontend --include-workspace-root --include=dev
COPY frontend frontend
RUN VITE_API_URL=/api npm run build --workspace frontend

FROM caddy:2-alpine AS web
COPY deployment/aws/Caddyfile /etc/caddy/Caddyfile
COPY --from=frontend-build /app/frontend/dist /srv
