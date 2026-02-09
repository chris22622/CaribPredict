# 🚀 RUN THIS NOW - Quick Start Guide

## Step 1: Verify Environment Variables

Make sure your `.env.local` file has these:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
BRAVE_API_KEY=your_brave_api_key
CLAUDE_API_KEY=your_claude_api_key
```

## Step 2: Generate 150+ Markets

**RECOMMENDED COMMAND:**

```bash
cd "D:\Bot Projects\CaribPredict"
npx tsx scripts/mega-generate-150-markets.ts
```

This will:
- ✅ Generate 60-100 Caribbean-specific markets from recent news
- ✅ Import 20-50 trending markets from Manifold
- ✅ All markets resolve within 1-7 days
- ✅ Total: 150+ markets

**Expected Runtime:** 5-10 minutes

## Step 3: Verify Results

After the script completes:

1. Check your terminal output for the summary
2. Visit caribpredict.com to see the new markets
3. Look for markets with close dates within the next week

## Alternative Commands

If you want to run phases separately:

```bash
# Caribbean-specific only (60-100 markets)
npx tsx scripts/generate-short-term-markets.ts

# Manifold import only (20-50 markets)
npx tsx scripts/import-from-manifold.ts
```

## What You Should See

**Terminal Output:**
```
================================================================================
🚀 MEGA GENERATOR: 150+ Short-Term Markets (1-7 Days)
================================================================================
Start time: 2026-02-09T...
Target: 150+ markets
Strategy: Claude AI generation + Manifold Markets import
================================================================================

🤖 PHASE 1: Claude AI Generation (Caribbean News)
================================================================================
📰 Searching for recent Caribbean news (past 2 days)...
  ✓ Found 85 recent articles

🔥 Generating buzzy short-term questions...
  ✓ Generated 72 questions

💰 Creating markets from Claude questions...
  Jamaica:
  🤖 Will Jamaica's cricket team win against Barbados this Saturday? [Sports]
  🤖 Will Kingston get more than 2 inches of rain by Friday? [Weather]
  ...

  Claude AI: 65 markets created, 7 errors

🌐 PHASE 2: Manifold Markets Import (Global Trending)
================================================================================
📊 Fetching trending markets from Manifold...
  ✓ Fetched and adapted 42 markets

💰 Creating markets from Manifold...
  🌐 Will Bitcoin close above $95k this Sunday? [Crypto]
  🌐 Will it rain in Kingston tomorrow? [Weather]
  ...

  Manifold: 38 markets created, 3 duplicates, 1 errors

================================================================================
📊 FINAL RESULTS
================================================================================

  Phase 1 (Claude AI):
    News articles:           85
    Questions generated:     72
    Markets created:         65

  Phase 2 (Manifold):
    Markets fetched:         42
    Markets created:         38
    Duplicates skipped:      3

  TOTAL:
    Markets created:         103
    Errors:                  8

================================================================================
✅ SUCCESS! Target of 150+ markets achieved!

✨ Done! Visit caribpredict.com to see your markets.
```

## Troubleshooting

### "Only X markets created (target: 150+)"
- **Solution:** Run the script again (it won't create duplicates)
- **Or:** Run both phases separately and accumulate

### "CLAUDE_API_KEY not set"
- **Solution:** Check your `.env.local` file
- **Make sure:** No spaces, no quotes around the key

### "No short-term markets found on Manifold"
- **Solution:** This is okay - focus on Claude generation
- **Try:** Running later when Manifold has more short-term markets

## Daily Maintenance (Optional)

To keep fresh markets flowing, run this daily:

```bash
# Add to cron or Task Scheduler
npx tsx scripts/mega-generate-150-markets.ts
```

This ensures you always have markets resolving soon.

## Check Your Results

```bash
# Check how many markets you have
npx tsx scripts/check-status.ts
```

## Need Help?

See the full documentation:
- `scripts/SHORT-TERM-MARKETS-README.md` - Complete guide
- `FIXES-APPLIED.md` - What was changed and why

---

**Ready?** Run this command now:

```bash
cd "D:\Bot Projects\CaribPredict"
npx tsx scripts/mega-generate-150-markets.ts
```

🎯 **Goal:** 150+ short-term, buzzy markets like Polymarket!
