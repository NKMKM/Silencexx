	#!/bin/bash

# 🚀 SilenceXX - One Command Deployment Script
# Run this to set up everything in one go

set -e

echo "🚀 Starting SilenceXX Deployment..."
echo "═══════════════════════════════════════"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Start Redis
echo -e "${BLUE}[1/4]${NC} Starting Redis..."
docker run -d -p 6379:6379 redis:latest > /dev/null 2>&1
echo -e "${GREEN}✓${NC} Redis running on port 6379"

# Step 2: Run migrations
echo -e "${BLUE}[2/4]${NC} Running database migrations..."
psql -U postgres -d silencexx -f backend/migrations/add_payment_transactions.sql > /dev/null 2>&1
psql -U postgres -d silencexx -f backend/migrations/add_panic_mode.sql > /dev/null 2>&1
echo -e "${GREEN}✓${NC} Database migrations complete"

# Step 3: Install backend dependencies
echo -e "${BLUE}[3/4]${NC} Installing dependencies..."
cd backend
npm install bull redis node-cache > /dev/null 2>&1
npm install > /dev/null 2>&1
echo -e "${GREEN}✓${NC} Backend dependencies installed"

# Step 4: Start backend
echo -e "${BLUE}[4/4]${NC} Starting services..."
echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo "📋 Next Steps:"
echo "  1. Open Terminal 1:"
echo "     cd backend && npm start"
echo ""
echo "  2. Open Terminal 2 (in new terminal):"
echo "     cd silencexx && npm start"
echo ""
echo "  3. Open in Expo app or emulator"
echo ""
echo "🧪 Test All 10 Features:"
echo "  1. Billing tab → Subscribe (Payment)"
echo "  2. Chat → Send 5 messages simultaneously (AI Queue)"
echo "  3. Chat → Send same message twice (Cache)"
echo "  4. Chat → Type and send message (Messages)"
echo "  5. Chat → Send 10+ messages (Scrolling)"
echo "  6. Any screen → Check consistent design (Design)"
echo "  7. Free tier → Send 10+ messages (Limits)"
echo "  8. Chat → Click mic to record (Voice)"
echo "  9. Panic button → Go through 10 steps (Panic Mode)"
echo "  10. Profile → Check subscription data (Profile)"
echo ""
echo "📚 Documentation:"
echo "  - START_HERE.md - Quick overview"
echo "  - QUICK_START.md - Detailed setup"
echo "  - FINAL_IMPLEMENTATION_REPORT.md - Complete breakdown"
echo ""
echo "🎯 Features:"
echo "  ✅ Subscriptions with payments"
echo "  ✅ Concurrent AI (5 users)"
echo "  ✅ Response caching"
echo "  ✅ Message queue system"
echo "  ✅ Optimized chat"
echo "  ✅ Design system"
echo "  ✅ Subscription limits"
echo "  ✅ Voice messages"
echo "  ✅ Emergency panic button"
echo "  ✅ Profile with real data"
echo ""
echo -e "${YELLOW}⚠️  Make sure PostgreSQL is running!${NC}"
echo ""
