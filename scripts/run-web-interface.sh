#!/bin/bash
# Run Web Interface - Start both HTTP gateway and React web app

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Dexter Web Interface Launcher${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Backend (HTTP Gateway):${NC} http://localhost:3000"
echo -e "${GREEN}Frontend (React App):${NC}   http://localhost:5173"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down servers...${NC}"

    # Kill all background processes in this process group
    jobs -p | xargs -r kill 2>/dev/null || true

    echo -e "${GREEN}Servers stopped.${NC}"
    exit 0
}

# Trap Ctrl+C and call cleanup
trap cleanup INT TERM

# Change to project root
cd "$PROJECT_ROOT"

# Start HTTP Gateway (Backend) in background
echo -e "${BLUE}[Backend]${NC} Starting HTTP Gateway on port 3000..."
bun run src/gateway/http-gateway.ts 2>&1 | sed "s/^/$(echo -e ${GREEN}[Backend]${NC}) /" &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 2

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}[Error]${NC} Failed to start HTTP Gateway"
    exit 1
fi

# Start React Web App (Frontend) in background
echo -e "${BLUE}[Frontend]${NC} Starting React app on port 5173..."
cd "$PROJECT_ROOT/src/web/client"
npm run dev 2>&1 | sed "s/^/$(echo -e ${BLUE}[Frontend]${NC}) /" &
FRONTEND_PID=$!

# Return to project root
cd "$PROJECT_ROOT"

# Wait a bit for frontend to start
sleep 3

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Both servers are running!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Backend:  ${GREEN}http://localhost:3000${NC}"
echo -e "Frontend: ${GREEN}http://localhost:5173${NC}"
echo ""
echo -e "${YELLOW}Open your browser and navigate to:${NC}"
echo -e "${BLUE}http://localhost:5173${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
