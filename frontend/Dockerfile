# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Build the Angular app
# ─────────────────────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

# Set working directory inside the container
WORKDIR /app

# Copy package files first (better Docker layer caching)
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy the rest of the Angular source code
COPY . .

# Build Angular in production mode
# Output goes to dist/frontend/browser/
RUN npm run build -- --configuration production

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — Serve with nginx
# ─────────────────────────────────────────────────────────────────────────────
FROM nginx:alpine

# Remove the default nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy the Angular build output from Stage 1 into nginx's html folder
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html

# Copy our custom nginx config (handles Angular SPA routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx in the foreground (required for Docker)
CMD ["nginx", "-g", "daemon off;"]
