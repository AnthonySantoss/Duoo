# Stage 1: Build Frontend
FROM node:18-alpine as builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Setup Server
FROM node:18
WORKDIR /app

# Create directory for persistent data
RUN mkdir -p /data
ENV DB_STORAGE=/data/database.sqlite
ENV NODE_ENV=production
ENV PORT=8080

# Install build dependencies
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Install Server Dependencies
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --only=production

# Copy Server Code
COPY server/ ./

# Copy Built Frontend from Stage 1 to server/public
COPY --from=builder /app/client/dist ./public

EXPOSE 8080

# Start Server
CMD ["npm", "start"]
