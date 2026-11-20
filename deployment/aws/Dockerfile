# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS node-base
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

FROM node-base AS api
# Keep the locked Prisma CLI available for the one-shot migration service.
RUN npm ci --workspace backend --include-workspace-root --include=dev
COPY backend/prisma backend/prisma
RUN npm run db:generate --workspace backend
COPY backend/src backend/src
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
