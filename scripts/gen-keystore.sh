#!/usr/bin/env bash
# ==============================================================================
# Noor Connect — Release Keystore Generator (Bash / Linux / macOS)
# ==============================================================================
# This script generates a 2048-bit RSA release signing keystore for Noor Connect.
#
# USAGE:
#   ./scripts/gen-keystore.sh [STOREPASS] [KEYPASS] [ALIAS] [KEYSTORE_FILE]
#
# EXAMPLES:
#   ./scripts/gen-keystore.sh
#   ./scripts/gen-keystore.sh noor123connect noor123connect noor-connect
#
# HOW TO ENCODE FOR GITHUB SECRETS (KEYSTORE_BASE64):
#   Linux/macOS:
#     base64 -w 0 noor-connect-release.keystore > keystore.txt
#     # (macOS without -w 0): base64 -i noor-connect-release.keystore | tr -d '\n' > keystore.txt
#
#   Windows PowerShell:
#     [Convert]::ToBase64String([IO.File]::ReadAllBytes("noor-connect-release.keystore"))
#
# GITHUB SECRETS TO CONFIGURE:
#   1. KEYSTORE_BASE64   -> The base64 output string of the keystore
#   2. KEYSTORE_STORE_PASS -> The store password (e.g. noor123connect)
#   3. KEYSTORE_KEY_PASS   -> The key password (e.g. noor123connect)
#   4. KEYSTORE_ALIAS      -> The key alias (e.g. noor-connect)
#
# WARNING: NEVER commit *.keystore or keystore.txt into Git!
# ==============================================================================

set -euo pipefail

STOREPASS="${1:-${KEYSTORE_STORE_PASS:-noor123connect}}"
KEYPASS="${2:-${KEYSTORE_KEY_PASS:-noor123connect}}"
ALIAS="${3:-${KEYSTORE_ALIAS:-noor-connect}}"
KEYSTORE_FILE="${4:-noor-connect-release.keystore}"
DNAME="${5:-CN=Noor Connect, OU=Release, O=Noor Connect, C=US}"

echo "======================================================="
echo "Generating Release Keystore for Noor Connect"
echo "  Keystore File: ${KEYSTORE_FILE}"
echo "  Key Alias:     ${ALIAS}"
echo "======================================================="

if [ -f "$KEYSTORE_FILE" ]; then
  echo "⚠️  File '$KEYSTORE_FILE' already exists."
  read -r -p "Overwrite? [y/N]: " CONFIRM
  if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "Aborting without overwrite."
    exit 0
  fi
  rm -f "$KEYSTORE_FILE"
fi

keytool -genkeypair \
  -v \
  -keystore "$KEYSTORE_FILE" \
  -alias "$ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass "$STOREPASS" \
  -keypass "$KEYPASS" \
  -dname "$DNAME"

echo ""
echo "✅ Keystore created successfully: $KEYSTORE_FILE"
echo ""
echo "To copy base64 string for GitHub Secret KEYSTORE_BASE64:"
if command -v base64 >/dev/null 2>&1; then
  echo "  (Linux): base64 -w 0 $KEYSTORE_FILE"
  echo "  (macOS): base64 -i $KEYSTORE_FILE | tr -d '\\n'"
fi
echo "  (PowerShell): [Convert]::ToBase64String([IO.File]::ReadAllBytes(\"$KEYSTORE_FILE\"))"
