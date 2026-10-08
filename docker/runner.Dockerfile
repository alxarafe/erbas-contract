FROM node:22.22.0-bookworm-slim@sha256:dd9d21971ec4395903fa6143c2b9267d048ae01ca6d3ea96f16cb30df6187d94

WORKDIR /runner
COPY docker/package.json docker/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund \
    && npm cache clean --force
COPY redocly.yaml ./
COPY openapi ./openapi
COPY bruno ./bruno
COPY scripts ./scripts
COPY tests ./tests
COPY docker/entrypoint.mjs ./entrypoint.mjs

ENV REDOCLY_TELEMETRY=off
USER node
ENTRYPOINT ["node", "/runner/entrypoint.mjs"]
