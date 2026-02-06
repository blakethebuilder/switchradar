# Build Stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . . # FORCED BUILD INVALIDATION 20260206

RUN npm run build

# Production Stage
FROM node:20-alpine
WORKDIR /app

# Install Nginx
RUN apk add --no-cache nginx

# Copy frontend build
COPY --from=build /app/dist /usr/share/nginx/html

# Copy Nginx config
COPY nginx.conf /etc/nginx/http.d/default.conf

# Copy backend files
COPY server ./server
COPY package*.json ./
RUN npm install --omit=dev

# Install server specific dependencies
WORKDIR /app/server
RUN npm install

WORKDIR /app

# Create data directory for SQLite
RUN mkdir -p data

# Expose port 80
EXPOSE 80

# Start script
COPY start.sh .
RUN chmod +x start.sh

CMD ["./start.sh"]
