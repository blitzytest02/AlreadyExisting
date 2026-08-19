# Multi-stage build for the Node.js tutorial application.
#
# The build context must be the REPOSITORY ROOT, not this directory: every COPY path below is
# written relative to the root, so a build started from infrastructure/docker cannot resolve them.
# infrastructure/docker/docker-compose.yml sets that context, and README.md documents it for a
# direct build.

FROM node:22-alpine AS builder

ARG NODE_ENV=production
ARG PORT=3000

WORKDIR /usr/src/app

# Manifests first, source second: this layer is what Docker caches, so a source-only change
# re-runs the copy below without re-running the install.
COPY src/backend/package.json src/backend/package-lock.json ./

# npm ci installs exactly what package-lock.json pins and fails if the two files disagree, which
# is what makes the build reproducible. This stage runs no build or test step, so nothing in it
# consumes the devDependencies it installs; the runtime stage below installs its own tree from the
# same two manifests, and that tree - not this one - is what the final image ships.
RUN npm ci --include=dev \
    && npm cache clean --force

# Copy the application source the runtime stage will need, and nothing else
# The build context is the repository root, and no .dockerignore is effective for it, so an
# unrestricted copy of src/backend/ would pull .env, .env.example, tests/, coverage/, the host's
# own node_modules and the development configuration into this layer and into the build cache.
# Naming the paths explicitly is what keeps them out. Directories are listed one per instruction
# with an explicit destination, because a COPY with several sources flattens directory contents
# into the destination and would destroy this layout.
COPY src/backend/server.js src/backend/app.js ./
COPY src/backend/config/ ./config/
COPY src/backend/routes/ ./routes/
COPY src/backend/middleware/ ./middleware/
COPY src/backend/utils/ ./utils/

FROM node:22-alpine

ARG NODE_ENV=production
ARG PORT=3000

ENV NODE_ENV=${NODE_ENV}
ENV PORT=${PORT}

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/package.json /usr/src/app/package-lock.json ./

# Install only production dependencies to minimize image size and security exposure
# --omit=dev excludes devDependencies from installation
# This install is unconditional: the runtime image ships runtime dependencies only, whatever
#   NODE_ENV is built with. Reaching for devDependencies here would put the whole test and
#   tooling graph - Jest, nodemon, Supertest and their transitive packages, including install
#   lifecycle scripts and a native binding - into the image that runs the application, which is
#   exactly the exposure a lean runtime stage exists to prevent.
# Development file watching therefore belongs to the host workflow, not to this image: run
#   `npm run dev` from src/backend, where nodemon is installed as a devDependency
#
# Known consequence for docker-compose.yml, recorded here because this stage is its cause:
#   the compose service overrides startup with `command: ["npm", "run", "dev"]` and keeps this
#   image's node_modules behind an anonymous volume, so the override resolves nodemon inside the
#   image and fails with `nodemon: not found` - and `restart: unless-stopped` turns that into a
#   restart loop. Compose selects no `target`, so it always builds this final stage. That is the
#   frozen baseline's behaviour as well, since the baseline installed
#   `npm ci --omit=dev --only=production` here; it is not a property introduced by making this
#   install unconditional. Do NOT resolve it by installing devDependencies in this stage.
#   The two supported resolutions both belong to docker-compose.yml: give it `target:` pointing
#   at a dedicated development stage that installs the dev graph, or drop the override so the
#   service runs the image's own `CMD ["npm", "start"]` and keep file watching host-local.
RUN npm ci --omit=dev \
    && npm cache clean --force

# Application source only, named path by named path. Copying the builder's workdir wholesale would
# bring its devDependency node_modules with it and undo the install above.
COPY --from=builder /usr/src/app/server.js /usr/src/app/app.js ./
COPY --from=builder /usr/src/app/config/ ./config/
COPY --from=builder /usr/src/app/routes/ ./routes/
COPY --from=builder /usr/src/app/middleware/ ./middleware/
COPY --from=builder /usr/src/app/utils/ ./utils/

# A dedicated non-root user, so the application never runs as root. The official image already
# ships a 'node' user, but creating one with a fixed uid/gid keeps ownership predictable across hosts.
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

# Ownership must change while still root, before the USER switch below.
RUN chown -R nodejs:nodejs /usr/src/app

# Declares the listening port as image metadata, so a host can discover and map it. It publishes
# nothing by itself.
EXPOSE ${PORT}

USER nodejs

# Reports the container as unhealthy once /hello stops answering. This drives Docker's own health
# status; nothing in this repository consumes it further.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/hello || exit 1

# CMD rather than ENTRYPOINT, so `docker run <image> <command>` can replace it - which is how the
# compose service substitutes `npm run dev`.
CMD ["npm", "start"]
