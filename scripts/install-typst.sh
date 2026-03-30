#!/bin/bash
# Install Typst binary into ./bin/ — this gets bundled into Vercel deployment
# via outputFileTracingIncludes in next.config.js

set -e

TYPST_VERSION="v0.13.1"
PROJ_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TYPST_BIN="${PROJ_ROOT}/bin/typst"

mkdir -p "${PROJ_ROOT}/bin"

if [ -f "${TYPST_BIN}" ]; then
  echo "Typst already installed: $(${TYPST_BIN} --version)"
  exit 0
fi

ARCH=$(uname -m)
if [ "${ARCH}" = "x86_64" ]; then
  ARCH_STR="x86_64-unknown-linux-musl"
elif [ "${ARCH}" = "aarch64" ]; then
  ARCH_STR="aarch64-unknown-linux-musl"
else
  echo "Unsupported arch: ${ARCH}"
  exit 1
fi

URL="https://github.com/typst/typst/releases/download/${TYPST_VERSION}/typst-${ARCH_STR}.tar.xz"
echo "Downloading Typst ${TYPST_VERSION} for ${ARCH_STR}..."

curl -fsSL "${URL}" | tar -xJ -C /tmp

BINARY=$(find /tmp -name "typst" -type f 2>/dev/null | head -1)
if [ -z "${BINARY}" ]; then
  echo "ERROR: typst binary not found after extraction"
  exit 1
fi

cp "${BINARY}" "${TYPST_BIN}"
chmod +x "${TYPST_BIN}"
echo "Typst installed: $(${TYPST_BIN} --version)"
echo "Binary location: ${TYPST_BIN}"