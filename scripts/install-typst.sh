#!/bin/bash
# Download Typst binary during Vercel build
# Installs to /usr/local/bin so it is on PATH at runtime

set -e

TYPST_VERSION="v0.13.1"

# Check if already installed anywhere
if command -v typst &>/dev/null; then
  echo "Typst already on PATH: $(typst --version)"
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
echo "Downloading Typst ${TYPST_VERSION}..."

curl -fsSL "${URL}" | tar -xJ -C /tmp

BINARY=$(find /tmp -name "typst" -type f 2>/dev/null | head -1)
if [ -z "${BINARY}" ]; then
  echo "ERROR: typst binary not found after extraction"
  exit 1
fi

# Try /usr/local/bin first, fall back to project bin/
if cp "${BINARY}" /usr/local/bin/typst 2>/dev/null; then
  chmod +x /usr/local/bin/typst
  echo "Typst installed to /usr/local/bin: $(typst --version)"
else
  mkdir -p "$(dirname "$0")/../bin"
  PROJ_BIN="$(cd "$(dirname "$0")/.." && pwd)/bin/typst"
  cp "${BINARY}" "${PROJ_BIN}"
  chmod +x "${PROJ_BIN}"
  echo "Typst installed to ${PROJ_BIN}: $(${PROJ_BIN} --version)"
fi