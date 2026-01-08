#!/usr/bin/env bash

# Build script for Send As Alias Thunderbird extension
# Reads version from manifest.json and creates XPI in parent directory

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Extract version from manifest.json
VERSION=$(grep -oP '"version":\s*"\K[^"]+' manifest.json)

if [ -z "$VERSION" ]; then
    echo "Error: Could not extract version from manifest.json"
    exit 1
fi

# Output file path (parent directory)
OUTPUT_FILE="../send-as-alias-${VERSION}.xpi"

echo "Building Send As Alias v${VERSION}..."

# Create XPI file
zip -r "$OUTPUT_FILE" \
    manifest.json \
    background.js \
    icons/ \
    options/ \
    popup/ \
    -x "*.DS_Store" \
    -x "__MACOSX/*" \
    -x "*/README.md"

echo "✓ Successfully created: $OUTPUT_FILE"
