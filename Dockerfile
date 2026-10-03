# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS check
COPY tsconfig.json server.ts mcp-stdio.ts ./
COPY app ./app
COPY tests ./tests
RUN npm run typecheck

FROM node:24-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DATA_DIR=/app/data
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=check /app/app ./app
COPY --from=check /app/server.ts /app/mcp-stdio.ts /app/tsconfig.json ./
COPY db ./db
COPY public/style.css public/favicon.svg ./public/
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--import", "remix/node-tsx", "server.ts"]
