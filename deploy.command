#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
./deploy.sh "Deploy WorldTrip AI updates"

echo
echo "Done. You can close this window."
read -r -p "Press Enter to close..."
