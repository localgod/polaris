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
ARG APP_VERSION=dev

ENV APP_VERSION=$APP_VERSION

RUN npm run build

# ---

FROM node:lts-alpine AS runner

WORKDIR /app

COPY --from=builder /app/.output ./output
# Cypher queries and JSON schemas are read at runtime via fs using process.cwd().
# process.cwd() is /app (WORKDIR), so copy files to match the expected paths.
COPY --from=builder /app/server/database/queries ./server/database/queries
COPY --from=builder /app/server/schemas ./server/schemas

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV APP_VERSION=dev

EXPOSE 3000

CMD ["node", "output/server/index.mjs"]

# ---

FROM node:lts-alpine AS migrator

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/schema ./schema
COPY --from=builder /app/package.json ./package.json

ENV NODE_ENV=production
