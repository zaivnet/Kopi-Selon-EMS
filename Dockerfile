FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL (required by Prisma)
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./
COPY database ./database/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm install

# Copy application source code
COPY . .

# Generate Prisma Client and build frontend + backend
RUN npx prisma generate --schema=database/schema.prisma
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install OpenSSL (required by Prisma at runtime)
RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV PORT=3333

# Copy node_modules and built assets from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/database ./database
COPY --from=builder /app/uploads ./uploads

# Ensure persistent directories exist
RUN mkdir -p database uploads

EXPOSE 3333

# Push database schema if needed and start the application
CMD ["sh", "-c", "npx prisma db push --schema=database/schema.prisma && npm start"]
