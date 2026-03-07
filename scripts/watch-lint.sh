#!/usr/bin/env bash
# Watch for file changes and auto-lint with Biome
# Run this at the start of a coding session
set -euo pipefail

cd "$(dirname "$0")/.."

echo "🔍 Watching for file changes (Biome auto-lint)..."

fswatch -0 -e "node_modules" -e "dist" -e ".astro" -e ".git" \
  --include="\.tsx?$" --include="\.jsx?$" --include="\.json$" \
  src/ api/ | while IFS= read -r -d '' file; do
    echo "  lint: $(basename "$file")"
    npx biome check --write --no-errors-on-unmatched "$file" 2>/dev/null || true
done
