#!/bin/sh
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "Installing JavaScript dependencies..."
if command -v corepack >/dev/null 2>&1; then
  corepack enable || true
fi

if command -v yarn >/dev/null 2>&1; then
  yarn install --frozen-lockfile
else
  npm install -g yarn
  yarn install --frozen-lockfile
fi

echo "Installing CocoaPods dependencies..."
cd "$REPO_ROOT/ios"

if command -v bundle >/dev/null 2>&1 && [ -f Gemfile ]; then
  bundle install
  bundle exec pod install
else
  pod install
fi
