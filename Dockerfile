# Production-grade Container for AegisTrace
FROM node:22-alpine

# Set working directory inside the container
WORKDIR /app

# Set default production environment
ENV NODE_ENV=production
ENV PORT=8000

# Install production dependencies first (enables Docker layer caching)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source code, services, and configurations
COPY . .

# Expose default port (overridden dynamically by platform via $PORT)
EXPOSE 8000

# Healthcheck to verify gateway orchestration status
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT:-8000}/api/system/status || exit 1

# Start the AegisTrace Gateway and internal microservices
CMD ["node", "server.js"]
