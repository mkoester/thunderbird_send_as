#!/usr/bin/env bash

# Build script for Send As Alias Thunderbird extension
# Reads version from manifest.json and creates XPI in parent directory
#
# Versioning rules:
# 1. If on main branch with no changes: use manifest version
# 2. If on other branch: use manifest version + dash + commit hash
# 3. If working tree has changes: append "-SNAPSHOT"

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Extract base version from manifest.json
BASE_VERSION=$(grep -oP '"version":\s*"\K[^"]+' manifest.json)

if [ -z "$BASE_VERSION" ]; then
    echo "Error: Could not extract version from manifest.json"
    exit 1
fi

# Determine if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Warning: Not in a git repository, using base version only"
    VERSION="$BASE_VERSION"
else
    # Get current branch name
    BRANCH=$(git rev-parse --abbrev-ref HEAD)

    # Get short commit hash
    COMMIT_HASH=$(git rev-parse --short HEAD)

    # Check if working tree is clean
    if git diff-index --quiet HEAD --; then
        HAS_CHANGES=false
    else
        HAS_CHANGES=true
    fi

    # Apply versioning rules
    if [ "$BRANCH" = "main" ] && [ "$HAS_CHANGES" = false ]; then
        # Rule 1: On main branch with no changes
        VERSION="$BASE_VERSION"
    else
        # Rule 2: On other branch (or main with changes before snapshot suffix)
        if [ "$BRANCH" != "main" ]; then
            VERSION="${BASE_VERSION}-${COMMIT_HASH}"
        else
            VERSION="$BASE_VERSION"
        fi

        # Rule 3: Working tree has changes
        if [ "$HAS_CHANGES" = true ]; then
            VERSION="${VERSION}-SNAPSHOT"
        fi
    fi

    if [ "$HAS_CHANGES" = true ]; then
        CLEAN_STATUS="dirty"
    else
        CLEAN_STATUS="clean"
    fi
    echo "Git info: branch=$BRANCH, commit=$COMMIT_HASH, status=$CLEAN_STATUS"
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
