# Multi-stage build for Phantom Trifid
# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy frontend package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY eslint.config.js ./

# Install frontend dependencies
RUN npm ci --only=production

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

# Install backend dependencies
RUN npm ci --only=production

# Copy backend source
COPY server/ ./

# Compile TypeScript
RUN npx tsc

# Stage 3: Production Runtime
FROM node:20-alpine AS production

WORKDIR /app

# Install production dependencies only
COPY server/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy compiled backend from builder
COPY --from=backend-builder /app/*.js ./
COPY --from=backend-builder /app/config ./config/
COPY --from=backend-builder /app/middleware ./middleware/
COPY --from=backend-builder /app/routes ./routes/
COPY --from=backend-builder /app/utils ./utils/

# Copy built frontend
COPY --from=frontend-builder /app/dist ./public

# Create necessary directories
RUN mkdir -p logs data

# Copy database file (will be replaced by Cloud Storage in production)
COPY server/database.json ./database.json

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "index.js"]
