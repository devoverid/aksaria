# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1.3.4 AS base
WORKDIR /usr/src/app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Dev deps (for Prisma generate)
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
COPY packages/aksaria-core/package.json /temp/dev/packages/aksaria-core/
COPY packages/aksaria-discord/package.json /temp/dev/packages/aksaria-discord/
RUN cd /temp/dev && bun install

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
COPY packages/aksaria-core/package.json /temp/prod/packages/aksaria-core/
COPY packages/aksaria-discord/package.json /temp/prod/packages/aksaria-discord/
COPY db /temp/prod/db
COPY prisma.config.ts /temp/prod/
RUN cd /temp/prod && bun install --production && bun prisma

# copy production dependencies and source code into final image
FROM base AS release
ENV NODE_ENV=production
COPY --chmod=755 docker/entrypoint.sh /entrypoint.sh
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=install /temp/prod/db ./db

# Copy monorepo packages
COPY packages/aksaria-core ./packages/aksaria-core
COPY packages/aksaria-discord ./packages/aksaria-discord

COPY prisma.config.ts .
COPY package.json .
COPY tsconfig.json .

# run the app
USER bun
ENTRYPOINT [ "/entrypoint.sh" ]