#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

message="${1:-Deploy WorldTrip AI updates}"

git status --short

if [[ -z "$(git status --short)" ]]; then
  echo "No changes to deploy."
  exit 0
fi

git add .
git commit -m "$message"
git push origin main

echo "Deployed to GitHub: https://github.com/Bing215/world-trip"
