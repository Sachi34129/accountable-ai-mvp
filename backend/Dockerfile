FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm install

# Copy source code
COPY backend ./backend

# Build
WORKDIR /app/backend
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy package files and install production dependencies
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy built files
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3000

CMD ["node", "dist/server.js"]

