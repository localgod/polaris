FROM node:lts-alpine AS builder

WORKDIR /app

# Copy package files first for layer caching
COPY package.json package-lock.json .npmrc ./

RUN npm ci

COPY . .

# Build args supply Neo4j connection so nuxt-neo4j module doesn't throw at build time.
# These values are overridden at runtime via the container's env_file.
ARG NEO4J_URI=bolt://neo4j:7687
ARG NEO4J_USERNAME=neo4j
ARG NEO4J_PASSWORD=placeholder

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
