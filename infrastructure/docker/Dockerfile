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

# Manifests first, source second, and deliberately no install in this stage. Nothing here builds,
# lints, bundles or tests, so a node_modules tree installed at this point would be work that every
# build pays for and then discards: the runtime stage below installs its own tree from these same
# two manifests, and that tree - not one from here - is what the final image ships. That install is
# also where `npm ci` compares package.json against package-lock.json and fails the build if the
# two disagree, so reproducibility does not depend on installing twice. This stage exists to gather
# the manifests and the application source into one flat layout the runtime stage can copy from.
COPY src/backend/package.json src/backend/package-lock.json ./

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

# npm's update notifier writes "New major version of npm available!" plus a changelog URL and an
# `npm install -g npm@...` instruction to the log stream, because CMD below runs the application
# through npm. In an image that is a learner's first container log those lines are noise that
# invites an upgrade inside a container nobody should be upgrading; they also arrive on the way out
# of a `docker stop`, mixed into the shutdown output. Disabling the notifier here keeps the log to
# application output, and because it precedes the install below the build log stays quiet too. It
# changes no dependency, no version and no behaviour of the application itself.
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

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

# Application source only, named path by named path. This copy lands on top of the production
# node_modules installed above, so it must bring nothing but the files the application needs:
# copying the builder's workdir wholesale would put whatever that stage happens to hold into the
# image that runs the application, which is how a dev dependency or a stray file gets shipped.
COPY --from=builder /usr/src/app/server.js /usr/src/app/app.js ./
COPY --from=builder /usr/src/app/config/ ./config/
COPY --from=builder /usr/src/app/routes/ ./routes/
COPY --from=builder /usr/src/app/middleware/ ./middleware/
COPY --from=builder /usr/src/app/utils/ ./utils/

# A dedicated non-root user, so the application never runs as root. The official image already
# ships a 'node' user, but creating one with a fixed uid/gid keeps ownership predictable across hosts.
#
# `-G nodejs` is what makes the gid half of that promise true. BusyBox `adduser` does not join the
# user to the group of the same name on its own: without it the account is created with the
# image's default group, `nogroup` (gid 65533), the `nodejs` group ends up with no members, and
# the process reaches its own files through their owner bits alone while sharing a catch-all gid
# with every other unprivileged account. The chown below writes nodejs:nodejs either way, so the
# mismatch is invisible from the file listing and only `id` reveals it.
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001 -G nodejs

# Ownership must change while still root, before the USER switch below.
RUN chown -R nodejs:nodejs /usr/src/app

# Declares the listening port as image metadata, so a host can discover and map it. It publishes
# nothing by itself.
EXPOSE ${PORT}

USER nodejs

# Reports the container as unhealthy once /hello stops answering. This drives Docker's own health
# status; nothing in this repository consumes it further.
#
# ${PORT} is interpolated by the shell at check time, so overriding it with `-e PORT=4300` moves
# the probe with the application. The value must be a usable port number, though, because this
# probe uses it literally while src/backend/config/index.js resolves it with
# `parseInt(process.env.PORT, 10) || 3000` - `abc` parses to NaN and `0` parses to the number 0,
# and both are falsy, so either one leaves the application on 3000. The probe then aims somewhere
# the application is not: `-e PORT=abc` fails with `wget: bad port 'abc'` and `-e PORT=0` fails
# with `Connection refused` from literal port 0, so after --retries=3 Docker reports a working
# container as unhealthy. The remedy is a usable numeric PORT, not a more forgiving probe - a
# probe that fell back to a fixed port would stop following a legitimate override, and the
# configuration boundary is the one place that decides what an unusable value becomes.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/hello || exit 1

# CMD rather than ENTRYPOINT, so `docker run <image> <command>` can replace it - which is how the
# compose service substitutes `npm run dev`.
#
# Running through npm makes npm PID 1, and that shapes how this container stops. `docker stop`
# sends SIGTERM to npm, npm forwards it to its `sh -c node server.js` child and then reports that
# signal-terminated child as a failed command, so a deliberate stop ends with exit code 1 and
# `npm error signal SIGTERM` in the log. The stop itself is prompt and complete - the process
# leaves within a second and the port is released, with no 10s SIGKILL fallback - but any
# orchestrator that reads exit status sees a failure. `CMD ["node", "server.js"]` would make node
# PID 1 and produce the conventional signal status; it is deliberately not used here, because
# `npm start` is the command this tutorial teaches and the entry point it documents.
CMD ["npm", "start"]
