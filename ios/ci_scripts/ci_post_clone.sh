#!/bin/sh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
IOS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$IOS_DIR/.." && pwd)"

echo "Xcode Cloud post-clone setup"
echo "Repository root: $REPO_ROOT"
echo "iOS directory: $IOS_DIR"

export HOMEBREW_NO_AUTO_UPDATE=1

if ! command -v node >/dev/null 2>&1; then
  echo "Installing Node..."
  brew install node
fi

if ! command -v yarn >/dev/null 2>&1; then
  echo "Installing Yarn..."
  brew install yarn
fi

if ! command -v pod >/dev/null 2>&1; then
  echo "Installing CocoaPods..."
  brew install cocoapods
fi

cd "$REPO_ROOT"
if [ ! -f amplify_outputs.json ]; then
  echo "error: amplify_outputs.json is missing. Commit the generated Amplify outputs file or generate it before Xcode Cloud builds." >&2
  exit 1
fi

echo "Installing JavaScript dependencies..."
yarn install --frozen-lockfile

cd "$IOS_DIR"
rm -f .xcode.env.local
printf 'export NODE_BINARY=%s\n' "$(command -v node)" > .xcode.env

echo "Installing CocoaPods dependencies..."
pod install --repo-update

echo "Xcode Cloud dependency setup complete"
