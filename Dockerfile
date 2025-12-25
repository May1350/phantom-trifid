# Multi-stage build for Phantom Trifid
# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy root package files for build scripts
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY eslint.config.js ./

# Install ALL dependencies (including devDependencies like vite, terser, etc.)
RUN npm install

# Copy frontend source
COPY index.html ./
COPY public/ ./public/
COPY src/ ./src/

# Build frontend
RUN npm run build

# Stage 2: Build Backend
FROM node:20-alpine AS backend-builder

WORKDIR /app

# Copy backend package files
COPY server/package*.json ./
COPY server/tsconfig.json ./

# Install ALL dependencies (including devDependencies like typescript)
RUN npm install

# Copy backend source
COPY server/ ./

# Compile TypeScript to dist/
RUN npx tsc

# Stage 3: Production Runtime
FROM node:20-alpine AS production

# Add build tools for native dependencies like bcrypt IF needed, 
# although we usually want to avoid this in production stage.
# But for now, let's add libc6-compat for better library support.
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++

WORKDIR /app

# Install production dependencies only for the server
COPY server/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy compiled backend from builder
COPY --from=backend-builder /app/dist ./

# Copy built frontend from Stage 1 to /app/public
COPY --from=frontend-builder /app/dist ./public

# Create necessary directories
RUN mkdir -p logs data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port (railway provides PORT env var)
EXPOSE 8080

# Start the application using compiled index.js
CMD ["node", "index.js"]
