# syntax=docker/dockerfile:1.7

FROM golang:1.25.0-bookworm AS go-toolchain

FROM node:24.14.0-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive \
    NODE_ENV=development \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    PATH=/usr/local/go/bin:${PATH}

COPY --from=go-toolchain /usr/local/go /usr/local/go

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       bash \
       ca-certificates \
       git \
       mupdf-tools \
       poppler-utils \
       qpdf \
       tini \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --no-audit --no-fund \
    && npx playwright install --with-deps chromium

COPY --chown=node:node . .

RUN npm run app:build \
    && cd dashboard \
    && go test ./... \
    && go build -trimpath -o /usr/local/bin/jobhunt-dashboard .

USER node

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["bash"]
