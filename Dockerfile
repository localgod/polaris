FROM node:lts-alpine AS builder

WORKDIR /app

# Copy package files first for layer caching
COPY package.json package-lock.json .npmrc ./

RUN npm ci

COPY . .

RUN npm run build

# ---

FROM node:lts-alpine AS runner

WORKDIR /app

COPY --from=builder /app/.output ./output

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["node", "output/server/index.mjs"]

# ---

FROM node:lts-alpine AS migrator

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/schema ./schema
COPY --from=builder /app/package.json ./package.json

ENV NODE_ENV=production
