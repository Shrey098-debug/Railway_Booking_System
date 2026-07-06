#!/usr/bin/env bash
# Starts all backend services + the frontend in ONE terminal.
# Each line of output is prefixed with the service name, e.g. [user-service].
# Press Ctrl+C once to stop everything.

cd "$(dirname "$0")" || exit 1

# Kill every child process (and this script) when you press Ctrl+C.
trap 'echo; echo "🛑 Stopping all services..."; kill 0' INT TERM

services=(
  api-gateway
  user-service
  admin-service
  booking-service
  inventory-service
  payment-service
  frontend
)

echo "🚀 Starting ${#services[@]} apps... (watch [user-service] for your signup OTP)"
echo "   Frontend will be at http://localhost:3000"
echo "   Press Ctrl+C once to stop everything."
echo "--------------------------------------------------------------"

for s in "${services[@]}"; do
  ( cd "$s" && npm run dev 2>&1 | sed "s/^/[$s] /" ) &
done

# Wait for all background jobs; Ctrl+C triggers the trap above.
wait