# Multi-stage build for Phantom Trifid
# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY eslint.config.js ./
RUN npm install
COPY index.html ./
COPY public/ ./public/
COPY src/ ./src/
RUN npm run build

# Stage 2: Build Backend
FROM node:20-alpine AS backend-builder
# Add build tools for native modules (bcrypt)
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY server/package*.json ./
COPY server/tsconfig.json ./
# Install ALL dependencies (including dev deps for tsc)
RUN npm install
COPY server/ ./
# Compile TypeScript to dist/
RUN npx tsc
# PRUNE dependencies to only production
RUN npm prune --production

# Stage 3: Production Runtime
FROM node:20-alpine AS production
# Add minimal native library support
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy PRUNED node_modules and compiled code from Stage 2
COPY --from=backend-builder /app/package*.json ./
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/dist ./

# Copy built frontend from Stage 1 to /app/public
COPY --from=frontend-builder /app/dist ./public

# Create necessary directories
RUN mkdir -p logs data

# Set environment variables
ENV NODE_ENV=production

# Start the application
CMD ["node", "index.js"]
