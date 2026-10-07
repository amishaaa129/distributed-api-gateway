# =========================
# Stage 1: Builder
# =========================

FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency files first
# This allows Docker to cache npm install
COPY package*.json ./

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

RUN npm ci

# Copy TypeScript configuration
COPY tsconfig.json ./

# Copy source code
COPY src ./src

# Compile TypeScript
RUN npm run build


# =========================
# Stage 2: Runner
# =========================

FROM node:22-alpine AS runner

WORKDIR /app

# Production environment
ENV NODE_ENV=production

# Copy dependency files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy compiled JavaScript
COPY --from=builder /app/dist ./dist

# API Gateway port
EXPOSE 8080

# Start gateway
CMD ["node", "dist/client.js"]