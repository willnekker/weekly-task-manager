# Multi-stage build for combined frontend and backend
FROM node:20 as frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Backend stage
FROM node:20 as backend-builder

WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ ./

# Final stage - combine both
FROM node:20

# Install nginx
RUN apt-get update && apt-get install -y nginx && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy backend
COPY --from=backend-builder /app/backend ./

# Copy frontend build to nginx directory
COPY --from=frontend-builder /app/frontend/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create directories
RUN mkdir -p /app/data /var/log/nginx /var/lib/nginx/tmp

# Create startup script
RUN cat > /app/start.sh << 'EOF'
#!/bin/sh
# Start nginx in background
nginx -g "daemon off;" &
# Start backend
exec node server.js
EOF

RUN chmod +x /app/start.sh

# Expose ports
EXPOSE 80

# Start both services
CMD ["/app/start.sh"]