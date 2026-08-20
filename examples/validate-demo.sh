#!/usr/bin/env bash
# End-to-end demonstration of scripts/validate-override.js.
#
#   ./examples/validate-demo.sh
#
# Expects: the valid record in overrides/ passes (exit 0), and the deliberately
# broken record in examples/ fails (exit 1).
set -uo pipefail

cd "$(dirname "$0")/.."

if [ ! -d node_modules/js-yaml ]; then
  echo "Installing dependencies..."
  npm install --silent
fi

echo "=== overrides/ (expect: pass, exit 0) ==="
node scripts/validate-override.js overrides
valid_status=$?
echo "exit code: ${valid_status}"

echo ""
echo "=== examples/ (expect: fail, exit 1) ==="
node scripts/validate-override.js examples
invalid_status=$?
echo "exit code: ${invalid_status}"

echo ""
if [ "${valid_status}" -eq 0 ] && [ "${invalid_status}" -eq 1 ]; then
  echo "Demo passed: the valid record is accepted and the broken one is rejected."
  exit 0
fi

echo "Demo failed: expected exit 0 then exit 1, got ${valid_status} then ${invalid_status}."
exit 1
