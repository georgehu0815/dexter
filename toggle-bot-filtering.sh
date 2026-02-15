#!/bin/bash
# Toggle bot prefix filtering on/off for Dexter gateway
# Usage: ./toggle-bot-filtering.sh [on|off]

GATEWAY_CONFIG="$HOME/.dexter/gateway.json"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if config exists
if [ ! -f "$GATEWAY_CONFIG" ]; then
    echo -e "${RED}Error: Gateway config not found at $GATEWAY_CONFIG${NC}"
    exit 1
fi

# Function to check current state
check_state() {
    if grep -q '"botName"' "$GATEWAY_CONFIG"; then
        CURRENT_BOT_NAME=$(grep '"botName"' "$GATEWAY_CONFIG" | sed 's/.*"botName": "\([^"]*\)".*/\1/')
        echo "enabled"
        return 0
    else
        echo "disabled"
        return 1
    fi
}

# Function to enable filtering
enable_filtering() {
    local BOT_NAME="${1:-dexter}"

    echo -e "${YELLOW}Enabling bot prefix filtering...${NC}"

    # Backup current config
    cp "$GATEWAY_CONFIG" "$GATEWAY_CONFIG.backup"
    echo -e "${GREEN}✓ Backup created at $GATEWAY_CONFIG.backup${NC}"

    # Add botName if not present
    if ! grep -q '"botName"' "$GATEWAY_CONFIG"; then
        # Insert botName after accountId
        sed -i.tmp 's/"accountId": "\([^"]*\)",/"accountId": "\1",\n    "botName": "'$BOT_NAME'",/' "$GATEWAY_CONFIG"
        rm "$GATEWAY_CONFIG.tmp" 2>/dev/null
        echo -e "${GREEN}✓ Bot name set to: $BOT_NAME${NC}"
    else
        echo -e "${YELLOW}Bot filtering already enabled${NC}"
    fi

    echo ""
    echo -e "${GREEN}Filtering ENABLED${NC}"
    echo "Bot will only respond to messages starting with: @$BOT_NAME"
    echo ""
    echo "Example usage:"
    echo "  ✅ '@$BOT_NAME hello' → Bot responds"
    echo "  ❌ '@otherbot hello' → Bot ignores"
    echo ""
}

# Function to disable filtering
disable_filtering() {
    echo -e "${YELLOW}Disabling bot prefix filtering...${NC}"

    # Backup current config
    cp "$GATEWAY_CONFIG" "$GATEWAY_CONFIG.backup"
    echo -e "${GREEN}✓ Backup created at $GATEWAY_CONFIG.backup${NC}"

    # Remove botName line
    if grep -q '"botName"' "$GATEWAY_CONFIG"; then
        sed -i.tmp '/"botName"/d' "$GATEWAY_CONFIG"
        rm "$GATEWAY_CONFIG.tmp" 2>/dev/null
        echo -e "${GREEN}✓ Bot name removed from config${NC}"
    else
        echo -e "${YELLOW}Bot filtering already disabled${NC}"
    fi

    echo ""
    echo -e "${GREEN}Filtering DISABLED${NC}"
    echo "Bot will respond to ALL messages (old behavior)"
    echo ""
}

# Function to show current status
show_status() {
    echo -e "${YELLOW}Current Status:${NC}"
    echo "Config file: $GATEWAY_CONFIG"
    echo ""

    if grep -q '"botName"' "$GATEWAY_CONFIG"; then
        BOT_NAME=$(grep '"botName"' "$GATEWAY_CONFIG" | sed 's/.*"botName": "\([^"]*\)".*/\1/')
        echo -e "  Filtering: ${GREEN}ENABLED${NC}"
        echo -e "  Bot Name: ${GREEN}$BOT_NAME${NC}"
        echo ""
        echo "  Bot responds to: @$BOT_NAME"
        echo "  Bot ignores: other prefixes"
    else
        echo -e "  Filtering: ${RED}DISABLED${NC}"
        echo ""
        echo "  Bot responds to: ALL messages"
    fi
    echo ""
}

# Main script
case "$1" in
    on|enable)
        BOT_NAME="${2:-dexter}"
        enable_filtering "$BOT_NAME"
        ;;
    off|disable)
        disable_filtering
        ;;
    status|"")
        show_status
        cat << EOF
Usage: $0 [COMMAND] [BOT_NAME]

Commands:
  on, enable [name]   Enable filtering (default name: dexter)
  off, disable        Disable filtering (respond to all messages)
  status             Show current filtering status

Examples:
  $0 on               # Enable with default name 'dexter'
  $0 on clawdbot      # Enable with name 'clawdbot'
  $0 off              # Disable filtering
  $0 status           # Show current status
  $0                  # Same as status

After changing, restart the gateway:
  bun run gateway
EOF
        ;;
    *)
        echo -e "${RED}Error: Unknown command '$1'${NC}"
        echo "Run '$0' without arguments to see usage"
        exit 1
        ;;
esac
