#!/bin/bash
# Download Typst binary during Vercel build

set -e

TYPST_VERSION="v0.13.1"
TYPST_BIN="./bin/typst"

if [ -f "${TYPST_BIN}" ]; then
  echo "Typst already installed"
  exit 0
fi

mkdir -p ./bin

ARCH=$(uname -m)
if [ "${ARCH}" = "x86_64" ]; then
  ARCH_STR="x86_64-unknown-linux-musl"
elif [ "${ARCH}" = "aarch64" ]; then
  ARCH_STR="aarch64-unknown-linux-musl"
else
  echo "Unsupported arch: ${ARCH}, skipping typst install"
  exit 0
fi

URL="https://github.com/typst/typst/releases/download/${TYPST_VERSION}/typst-${ARCH_STR}.tar.xz"
echo "Downloading Typst from ${URL}..."

curl -fsSL "${URL}" | tar -xJ -C /tmp 2>/dev/null || {
  echo "Download failed — will use puppeteer fallback"
  exit 0
}

BINARY=$(find /tmp -name "typst" -type f 2>/dev/null | head -1)
if [ -n "${BINARY}" ]; then
  cp "${BINARY}" "${TYPST_BIN}"
  chmod +x "${TYPST_BIN}"
  echo "Typst installed: $(${TYPST_BIN} --version)"
else
  echo "Typst binary not found after download — will use fallback"
fi
