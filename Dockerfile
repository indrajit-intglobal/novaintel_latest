# # Multi-stage build for React frontend
# FROM node:20-alpine as builder

# # Set working directory
# WORKDIR /app

# # Copy package files
# COPY package*.json ./

# # Install dependencies
# RUN npm ci

# # Copy source code
# COPY . .

# # Build the application
# # Note: VITE_API_BASE_URL will be set at runtime via Cloud Run env vars
# RUN npm run build

# # Production stage with Nginx
# FROM nginx:alpine

# # Copy custom nginx configuration
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# # Copy built application from builder
# COPY --from=builder /app/dist /usr/share/nginx/html

# # Expose port 8080 (Cloud Run default)
# EXPOSE 8080

# # Health check
# HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
#     CMD wget --quiet --tries=1 --spider http://localhost:8080/ || exit 1

# # Start Nginx
# CMD ["nginx", "-g", "daemon off;"]



# Multi-stage build for React frontend
FROM node:20-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm install

# Copy source code (this includes your new .env.production file)
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8080/ || exit 1
CMD ["nginx", "-g", "daemon off;"]