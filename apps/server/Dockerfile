# This dockerfile is used to build the production image of the BAM OTF Server.
# It is a multi-stage build, which means that it will run multiple stages:
# 1) Create a pruned version of the repo which only contains the files needed to build the app
# 2) Install all node_modules, including dev dependencies
# 3) Setup production node_modules
# 4) Build the app

# set the base image for all the other steps
FROM node:21-bullseye-slim AS base
# Install openssl for Prisma
# 👇 Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
# RUN apk add --no-cache openssl libc6-compat
# RUN apk update
RUN apt-get update && apt-get install -y openssl
RUN npm install -g pnpm


# STAGE 1
FROM base AS pruned
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune --scope=@bamotf/server --docker


# STAGE 2
FROM base AS deps
# 👇 bash is needed for the wait-for-it script
# RUN apk add --no-cache --upgrade bash
WORKDIR /app

COPY --from=pruned /app/out/json/ .
COPY --from=pruned /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# First install the dependencies (as they change less often)
RUN pnpm install --frozen-lockfile --ignore-scripts


# STAGE 3
FROM base as production-deps
RUN apt-get install -y rsync

ENV NODE_ENV production

WORKDIR /app

COPY --from=pruned /app/out/json/ .
COPY --from=pruned /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Install the dependencies needed for production
RUN pnpm install --frozen-lockfile --ignore-scripts

# Ideally we would be prunning from dev but it gets stuck on the postinstall script
# COPY --from=deps /app .
# COPY /scripts/prepare.js ./scripts/prepare.js
# COPY /apps/server/scripts/postinstall.sh ./apps/server/scripts/postinstall.sh
# RUN SKIP_SCRIPTS=true pnpm prune --prod


# STAGE 4
FROM base as build

ENV NODE_ENV production

WORKDIR /app

COPY --from=pruned /app/out/full/ .
COPY --from=deps /app/ .
# HACK: We need to copy the config folder but maybe me should just move it to another package
COPY ./config ./config

# Build the project
# TODO: turbo stopped working on docker, so I changed to use pnpm straight
# RUN pnpm build --filter=server...
RUN pnpm -C apps/server build


# STAGE 5
FROM base as final

ENV NODE_ENV production
ENV PORT=21000
# ENV REDIS_URL=$REDIS_URL
# ENV POSTGRES_URL=$POSTGRES_URL
# ENV BITCOIN_CORE_URL=$BITCOIN_CORE_URL
# ENV PRICE_DATA_SERVER_TOR_URL=$PRICE_DATA_SERVER_TOR_URL
# ENV PRICE_DATA_SERVER_CLEARNET_URL=$PRICE_DATA_SERVER_CLEARNET_URL
# ENV HOST=localhost
# ENV LOG_LEVEL=silly

RUN mkdir /app
WORKDIR /app

COPY --from=production-deps /app/ .
COPY --from=build /app/apps/server/build ./apps/server/build
COPY --from=build /app/apps/server/public ./apps/server/public
COPY --from=build /app/packages/utils/dist ./packages/utils/dist
COPY --from=pruned /app/out/full/apps/server/scripts/ ./apps/server/scripts
COPY --from=pruned /app/out/full/apps/server/prisma/ ./apps/server/prisma

EXPOSE ${PORT}   

RUN apt-get install -y curl
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3  \
    CMD curl --fail http://localhost:$PORT || exit 1 

# use this to keep the container running for debugging
# CMD sleep infinity
CMD apps/server/scripts/docker-start.sh