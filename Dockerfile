# Multi-stage build for Phantom Trifid
# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY eslint.config.js ./

# Install ALL dependencies
RUN npm install

# Copy frontend source
COPY index.html ./
COPY public/ ./public/
COPY src/ ./src/

# Build frontend
RUN npm run build

# Stage 2: Build Backend
FROM node:20-alpine AS backend-builder

# Add build tools for native modules (bcrypt)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy backend package files
COPY server/package*.json ./
COPY server/tsconfig.json ./

# Install ALL dependencies
RUN npm install

# Copy backend source
COPY server/ ./

# Compile TypeScript to dist/
RUN npx tsc

# Stage 3: Production Runtime
FROM node:20-alpine AS production

# Add runtime library support
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install production dependencies ONLY
COPY server/package*.json ./
RUN npm install --production && npm cache clean --force

# Copy compiled backend from Stage 2
COPY --from=backend-builder /app/dist ./
# Copy database file
# Note: we don't COPY database.json anymore to avoid build failures if missing

# Copy built frontend from Stage 1 to /app/public
COPY --from=frontend-builder /app/dist ./public

# Create necessary directories
RUN mkdir -p logs data

# Set environment variables
ENV NODE_ENV=production

# Start the application using start script
CMD ["npm", "start"]
