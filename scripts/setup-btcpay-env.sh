#!/bin/bash

###############################################################################
# BTCPay Environment Setup Script for CaribPredict
#
# This script helps you configure BTCPay Server environment variables
# and validates the connection to ensure everything is working correctly.
#
# Usage:
#   bash scripts/setup-btcpay-env.sh
#
# Requirements:
#   - curl (for API testing)
#   - jq (for JSON parsing) - optional but recommended
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env.local"

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   BTCPay Server Environment Setup for CaribPredict        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

###############################################################################
# Helper Functions
###############################################################################

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

prompt_input() {
    local prompt="$1"
    local var_name="$2"
    local default="$3"
    local is_secret="${4:-false}"

    if [ -n "$default" ]; then
        echo -e "${YELLOW}$prompt${NC} ${BLUE}[default: $default]${NC}"
    else
        echo -e "${YELLOW}$prompt${NC}"
    fi

    if [ "$is_secret" = "true" ]; then
        read -s value
        echo  # Add newline after secret input
    else
        read value
    fi

    if [ -z "$value" ] && [ -n "$default" ]; then
        value="$default"
    fi

    eval "$var_name='$value'"
}

validate_url() {
    local url="$1"
    if [[ ! "$url" =~ ^https?:// ]]; then
        return 1
    fi
    return 0
}

validate_not_empty() {
    local value="$1"
    if [ -z "$value" ]; then
        return 1
    fi
    return 0
}

check_command() {
    local cmd="$1"
    if ! command -v "$cmd" &> /dev/null; then
        return 1
    fi
    return 0
}

###############################################################################
# Pre-flight Checks
###############################################################################

echo -e "\n${BLUE}Running pre-flight checks...${NC}\n"

# Check if curl is installed
if check_command curl; then
    print_success "curl is installed"
else
    print_error "curl is not installed (required for API testing)"
    echo "Install curl:"
    echo "  - Ubuntu/Debian: sudo apt-get install curl"
    echo "  - Mac: brew install curl"
    echo "  - Windows: Use Git Bash or WSL"
    exit 1
fi

# Check if jq is installed (optional but helpful)
if check_command jq; then
    print_success "jq is installed (JSON parsing enabled)"
    HAS_JQ=true
else
    print_warning "jq is not installed (optional, but recommended for better output)"
    echo "Install jq:"
    echo "  - Ubuntu/Debian: sudo apt-get install jq"
    echo "  - Mac: brew install jq"
    echo "  - Windows: Download from https://stedolan.github.io/jq/"
    HAS_JQ=false
    echo
fi

# Check if .env.local exists
if [ -f "$ENV_FILE" ]; then
    print_success ".env.local file found"
    echo
    print_warning "Existing .env.local will be backed up to .env.local.backup"
    cp "$ENV_FILE" "$ENV_FILE.backup"
    print_success "Backup created"
else
    print_info ".env.local doesn't exist yet (will create it)"
fi

###############################################################################
# Collect BTCPay Configuration
###############################################################################

echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  BTCPay Server Configuration${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

print_info "Please provide your BTCPay Server credentials."
print_info "If you haven't deployed BTCPay yet, see: docs/LUNANODE-BTCPAY-DEPLOYMENT.md"
echo

# Prompt for BTCPAY_HOST
while true; do
    prompt_input "Enter your BTCPay Server URL (e.g., https://btcpay.caribpredict.com):" BTCPAY_HOST ""
    if validate_url "$BTCPAY_HOST"; then
        # Remove trailing slash if present
        BTCPAY_HOST="${BTCPAY_HOST%/}"
        print_success "Valid URL format"
        break
    else
        print_error "Invalid URL format. Must start with http:// or https://"
    fi
done

# Prompt for BTCPAY_API_KEY
while true; do
    prompt_input "Enter your BTCPay API Key (starts with 'btcpay_'):" BTCPAY_API_KEY "" true
    if validate_not_empty "$BTCPAY_API_KEY"; then
        print_success "API Key received"
        break
    else
        print_error "API Key cannot be empty"
    fi
done

# Prompt for BTCPAY_STORE_ID
while true; do
    prompt_input "Enter your BTCPay Store ID:" BTCPAY_STORE_ID ""
    if validate_not_empty "$BTCPAY_STORE_ID"; then
        print_success "Store ID received"
        break
    else
        print_error "Store ID cannot be empty"
    fi
done

# Prompt for BTCPAY_WEBHOOK_SECRET
print_info "Generate a webhook secret with: openssl rand -hex 32"
while true; do
    prompt_input "Enter your BTCPay Webhook Secret:" BTCPAY_WEBHOOK_SECRET "" true
    if validate_not_empty "$BTCPAY_WEBHOOK_SECRET"; then
        print_success "Webhook secret received"
        break
    else
        print_error "Webhook secret cannot be empty"
    fi
done

# Prompt for NEXT_PUBLIC_SITE_URL
echo
prompt_input "Enter your CaribPredict site URL:" NEXT_PUBLIC_SITE_URL "https://www.caribpredict.com"
NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL%/}"  # Remove trailing slash

###############################################################################
# Validate BTCPay Connection
###############################################################################

echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Validating BTCPay Connection${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

print_info "Testing connection to BTCPay Server..."

# Test 1: Check if server is reachable
echo -e "\n${BLUE}Test 1: Server Reachability${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BTCPAY_HOST" || echo "000")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "301" ]; then
    print_success "BTCPay Server is reachable (HTTP $HTTP_CODE)"
else
    print_error "Cannot reach BTCPay Server (HTTP $HTTP_CODE)"
    print_warning "This might be a temporary issue or incorrect URL"
    echo
    read -p "Continue anyway? (y/n): " continue_choice
    if [ "$continue_choice" != "y" ]; then
        print_error "Setup cancelled"
        exit 1
    fi
fi

# Test 2: Check API authentication
echo -e "\n${BLUE}Test 2: API Authentication${NC}"
API_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -H "Authorization: token $BTCPAY_API_KEY" \
    -H "Content-Type: application/json" \
    "$BTCPAY_HOST/api/v1/stores/$BTCPAY_STORE_ID" 2>&1)

HTTP_CODE=$(echo "$API_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$API_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
    print_success "API authentication successful"

    if [ "$HAS_JQ" = true ]; then
        STORE_NAME=$(echo "$RESPONSE_BODY" | jq -r '.name // "Unknown"')
        print_info "Store Name: $STORE_NAME"
    fi
else
    print_error "API authentication failed (HTTP $HTTP_CODE)"
    if [ "$HAS_JQ" = true ]; then
        ERROR_MSG=$(echo "$RESPONSE_BODY" | jq -r '.message // .error // "Unknown error"')
        print_error "Error: $ERROR_MSG"
    else
        print_error "Response: $RESPONSE_BODY"
    fi
    print_warning "Please check your API key and Store ID"
    echo
    read -p "Continue anyway? (y/n): " continue_choice
    if [ "$continue_choice" != "y" ]; then
        print_error "Setup cancelled"
        exit 1
    fi
fi

# Test 3: Check store permissions
echo -e "\n${BLUE}Test 3: API Permissions${NC}"
PERMISSIONS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -H "Authorization: token $BTCPAY_API_KEY" \
    -H "Content-Type: application/json" \
    "$BTCPAY_HOST/api/v1/api-keys/current" 2>&1)

HTTP_CODE=$(echo "$PERMISSIONS_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$PERMISSIONS_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
    print_success "API permissions validated"

    if [ "$HAS_JQ" = true ]; then
        PERMISSIONS=$(echo "$RESPONSE_BODY" | jq -r '.permissions[]' 2>/dev/null || echo "")
        if [ -n "$PERMISSIONS" ]; then
            print_info "Permissions:"
            echo "$PERMISSIONS" | while read perm; do
                echo "  - $perm"
            done
        fi
    fi
else
    print_warning "Could not validate permissions (HTTP $HTTP_CODE)"
    print_info "This is optional - your API key might still work"
fi

###############################################################################
# Write Environment File
###############################################################################

echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Writing Environment Variables${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

# Read existing .env.local if it exists
if [ -f "$ENV_FILE" ]; then
    source "$ENV_FILE" 2>/dev/null || true
fi

# Create/update .env.local with BTCPay variables
cat > "$ENV_FILE" << EOF
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL:-https://your-project.supabase.co}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY:-your_anon_key}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY:-your_service_role_key}

# BTCPay Server Configuration
BTCPAY_HOST=$BTCPAY_HOST
BTCPAY_API_KEY=$BTCPAY_API_KEY
BTCPAY_STORE_ID=$BTCPAY_STORE_ID
BTCPAY_WEBHOOK_SECRET=$BTCPAY_WEBHOOK_SECRET

# Site Configuration
NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

# API Keys
BRAVE_API_KEY=${BRAVE_API_KEY:-your_brave_api_key}
CLAUDE_API_KEY=${CLAUDE_API_KEY:-your_claude_api_key}

# Optional: Manifold Markets Integration
MANIFOLD_API_KEY=${MANIFOLD_API_KEY:-your_manifold_api_key}
EOF

print_success "Environment variables written to $ENV_FILE"

###############################################################################
# Display Summary
###############################################################################

echo -e "\n${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Setup Complete! ✓${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}\n"

echo -e "${BLUE}Configuration Summary:${NC}"
echo "  BTCPay Host:      $BTCPAY_HOST"
echo "  Store ID:         $BTCPAY_STORE_ID"
echo "  API Key:          ${BTCPAY_API_KEY:0:15}...${BTCPAY_API_KEY: -10}"
echo "  Webhook Secret:   ${BTCPAY_WEBHOOK_SECRET:0:10}...${BTCPAY_WEBHOOK_SECRET: -10}"
echo "  Site URL:         $NEXT_PUBLIC_SITE_URL"
echo

echo -e "${BLUE}Next Steps:${NC}"
echo
echo "1. ${YELLOW}Configure Webhook in BTCPay:${NC}"
echo "   - Go to: $BTCPAY_HOST/stores/$BTCPAY_STORE_ID/webhooks"
echo "   - Add webhook URL: $NEXT_PUBLIC_SITE_URL/api/webhooks/btcpay"
echo "   - Use the webhook secret you provided"
echo
echo "2. ${YELLOW}Test Locally:${NC}"
echo "   cd $PROJECT_ROOT"
echo "   npm run dev"
echo "   Visit http://localhost:3000 and try creating a deposit"
echo
echo "3. ${YELLOW}Deploy to Vercel:${NC}"
echo "   See: docs/DEPLOY-BTCPAY-TO-VERCEL.md"
echo "   Add all environment variables to Vercel"
echo "   Redeploy your application"
echo
echo "4. ${YELLOW}Test Production:${NC}"
echo "   Visit $NEXT_PUBLIC_SITE_URL"
echo "   Make a small test deposit (\$5-10)"
echo "   Verify balance updates after payment"
echo

print_success "BTCPay Server is ready to use!"
echo
print_info "For troubleshooting, see: docs/LUNANODE-BTCPAY-DEPLOYMENT.md"
echo

###############################################################################
# Generate Quick Reference
###############################################################################

QUICK_REF_FILE="$PROJECT_ROOT/BTCPAY-CREDENTIALS.txt"

cat > "$QUICK_REF_FILE" << EOF
╔════════════════════════════════════════════════════════════╗
║         BTCPay Server Credentials - CaribPredict          ║
╚════════════════════════════════════════════════════════════╝

⚠️  KEEP THIS FILE SECURE - DO NOT COMMIT TO GIT ⚠️

Generated: $(date)

BTCPay Server URL:
  $BTCPAY_HOST

Store ID:
  $BTCPAY_STORE_ID

API Key:
  $BTCPAY_API_KEY

Webhook Secret:
  $BTCPAY_WEBHOOK_SECRET

Webhook URL (configure in BTCPay):
  $NEXT_PUBLIC_SITE_URL/api/webhooks/btcpay

Quick Links:
  - Dashboard:  $BTCPAY_HOST
  - Store:      $BTCPAY_HOST/stores/$BTCPAY_STORE_ID
  - Webhooks:   $BTCPAY_HOST/stores/$BTCPAY_STORE_ID/webhooks
  - Invoices:   $BTCPAY_HOST/invoices
  - Wallets:    $BTCPAY_HOST/wallets

Test Commands:
  # Check store
  curl -H "Authorization: token $BTCPAY_API_KEY" \\
    $BTCPAY_HOST/api/v1/stores/$BTCPAY_STORE_ID

  # Create test invoice
  curl -X POST -H "Authorization: token $BTCPAY_API_KEY" \\
    -H "Content-Type: application/json" \\
    -d '{"amount":"10","currency":"USD"}' \\
    $BTCPAY_HOST/api/v1/stores/$BTCPAY_STORE_ID/invoices

═══════════════════════════════════════════════════════════════
EOF

print_success "Quick reference saved to: $QUICK_REF_FILE"
print_warning "Keep this file secure and do not commit to Git!"

echo
echo -e "${GREEN}Happy Bitcoin payments! 🚀${NC}"
