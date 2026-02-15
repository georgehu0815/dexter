#!/bin/bash
# Restart Web Interface - Kill existing processes and start fresh with verbose logging

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}   Dexter Web Interface Restart${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Function to kill process on a specific port
kill_port() {
    local port=$1
    local pids=$(lsof -ti:$port 2>/dev/null)

    if [ -n "$pids" ]; then
        echo -e "${YELLOW}[Cleanup]${NC} Killing process(es) on port $port..."
        echo "$pids" | xargs kill 2>/dev/null || true
        sleep 0.5

        # Force kill if still running
        pids=$(lsof -ti:$port 2>/dev/null)
        if [ -n "$pids" ]; then
            echo -e "${RED}[Cleanup]${NC} Force killing stubborn process(es) on port $port..."
            echo "$pids" | xargs kill -9 2>/dev/null || true
        fi

        echo -e "${GREEN}[Cleanup]${NC} Port $port cleared ✓"
    else
        echo -e "${BLUE}[Cleanup]${NC} Port $port already free ✓"
    fi
}

# Kill backend (port 3000)
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW} Cleaning up existing processes...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

kill_port 3000

# Kill frontend (ports 5173 and 5174)
kill_port 5173
kill_port 5174

echo ""
echo -e "${GREEN}✓ All ports cleared!${NC}"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN} Starting servers with verbose logging...${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Change to project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Start with verbose logging
exec npm run web:verbose
