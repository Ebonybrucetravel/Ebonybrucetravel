# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (including devDependencies for build)
# scripts/ required for postinstall (Prisma 7 shim)
COPY package.json package-lock.json ./
COPY scripts ./scripts/
RUN npm ci

# Copy source (excludes node_modules, dist, generated via .dockerignore)
COPY . .

# Generate Prisma client then build (generated/ required for @prisma/client resolution)
RUN npx prisma generate && npm run build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install production dependencies only
# scripts/ required for postinstall (Prisma 7 shim)
COPY package.json package-lock.json ./
COPY scripts ./scripts/
RUN npm ci --omit=dev

# Copy generated Prisma client and schema from builder
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma

# Copy built application
COPY --from=builder /app/dist ./dist

# Secrets (DATABASE_URL, JWT_SECRET, etc.) are injected at runtime by Railway
# Do NOT use ARG/ENV for secrets in Dockerfile - Railway provides them when the container starts

EXPOSE 3001

CMD ["node", "dist/main.js"]
