#!/bin/bash
# Run Web Interface - Start both servers with VERBOSE logging

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${MAGENTA}========================================${NC}"
echo -e "${MAGENTA}   Dexter Web Interface (VERBOSE)${NC}"
echo -e "${MAGENTA}========================================${NC}"
echo ""
echo -e "${CYAN}Backend:${NC}  http://localhost:3000"
echo -e "${CYAN}Frontend:${NC} http://localhost:5173"
echo ""
echo -e "${YELLOW}All logs will be displayed with timestamps${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
echo ""
echo -e "${MAGENTA}----------------------------------------${NC}"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}   Shutting down servers...${NC}"
    echo -e "${YELLOW}========================================${NC}"

    # Kill all background processes
    jobs -p | xargs -r kill 2>/dev/null || true

    # Give processes time to cleanup
    sleep 1

    echo -e "${GREEN}Servers stopped successfully.${NC}"
    exit 0
}

# Trap Ctrl+C
trap cleanup INT TERM

# Helper function to add timestamps and labels
log_with_label() {
    local label=$1
    local color=$2

    while IFS= read -r line; do
        timestamp=$(date '+%H:%M:%S.%3N')
        echo -e "${color}[${timestamp}]${NC} ${label} ${line}"
    done
}

# Change to project root
cd "$PROJECT_ROOT"

# Start HTTP Gateway (Backend)
echo -e "${GREEN}[START]${NC} HTTP Gateway starting on port 3000..."
(
    cd "$PROJECT_ROOT"
    NODE_ENV=development DEBUG=* bun run src/gateway/http-gateway.ts 2>&1
) | log_with_label "[${GREEN}Backend${NC}] " "$GREEN" &
BACKEND_PID=$!

# Wait for backend to initialize
sleep 3

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}[ERROR]${NC} HTTP Gateway failed to start"
    echo -e "${RED}[ERROR]${NC} Check logs above for details"
    exit 1
fi

echo -e "${GREEN}[READY]${NC} HTTP Gateway is ready"
echo ""

# Start React Web App (Frontend)
echo -e "${BLUE}[START]${NC} React app starting on port 5173..."
(
    cd "$PROJECT_ROOT/src/web/client"
    npm run dev 2>&1
) | log_with_label "[${BLUE}Frontend${NC}]" "$BLUE" &
FRONTEND_PID=$!

# Wait for frontend to initialize
sleep 3

# Check if frontend started successfully
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${RED}[ERROR]${NC} React app failed to start"
    echo -e "${RED}[ERROR]${NC} Check logs above for details"
    cleanup
    exit 1
fi

echo ""
echo -e "${MAGENTA}========================================${NC}"
echo -e "${MAGENTA}   All systems operational!${NC}"
echo -e "${MAGENTA}========================================${NC}"
echo ""
echo -e "${CYAN}Backend API:${NC}  http://localhost:3000"
echo -e "${CYAN}Web App:${NC}      http://localhost:5173"
echo ""
echo -e "${GREEN}Health Check:${NC} http://localhost:3000/api/health"
echo -e "${GREEN}API Docs:${NC}     http://localhost:3000/api"
echo ""
echo -e "${YELLOW}Logging:${NC}      All logs displayed with timestamps"
echo -e "${YELLOW}Shutdown:${NC}     Press Ctrl+C to stop both servers"
echo ""
echo -e "${MAGENTA}----------------------------------------${NC}"
echo -e "${CYAN}Ready to accept requests!${NC}"
echo -e "${MAGENTA}----------------------------------------${NC}"
echo ""

# Wait for both processes (keeps script running)
wait $BACKEND_PID $FRONTEND_PID
