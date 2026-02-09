# Short-Term Markets Generation Guide

## Problem Solved
This update fixes the issue where markets had long-term resolution dates (months away). All new markets now resolve within **1-7 days** and focus on **buzzy, exciting topics** like Polymarket.

## What Changed

### 1. Updated Question Generator (`lib/claude-generator.ts`)
- ✅ Enforces 1-7 day resolution window (hard validation)
- ✅ New exciting categories: Sports, Crypto, Weather, Pop Culture, Breaking News, Business, Social
- ✅ Improved prompts to generate BUZZY questions people want to bet on
- ✅ Specific date language: "by Friday", "this Saturday", "tomorrow"

### 2. New Manifold Integration (`lib/manifold.ts`)
- ✅ Fetches trending markets from Manifold Markets API
- ✅ Filters for short-term markets (closing within 7 days)
- ✅ Adapts global markets to Caribbean context
- ✅ Provides additional market volume

### 3. New Scripts

#### `import-from-manifold.ts`
Imports trending markets from Manifold Markets and adapts them.

**Usage:**
```bash
npx tsx scripts/import-from-manifold.ts
```

**What it does:**
- Fetches top 100 trending markets from Manifold
- Filters for markets closing within 7 days
- Adapts them for Caribbean context
- Creates markets in database

**Expected output:** 20-50 markets

---

#### `generate-short-term-markets.ts`
Generates Caribbean-specific short-term markets using Claude AI.

**Usage:**
```bash
npx tsx scripts/generate-short-term-markets.ts
```

**What it does:**
- Searches for recent Caribbean news (past 2 days)
- Generates 5-8 questions per country
- All questions resolve within 1-7 days
- Creates markets in database

**Expected output:** 60-100 markets

---

#### `mega-generate-150-markets.ts` ⭐ RECOMMENDED
Combines both Claude + Manifold to hit 150+ market target.

**Usage:**
```bash
npx tsx scripts/mega-generate-150-markets.ts
```

**What it does:**
- **Phase 1:** Claude AI generation from Caribbean news
- **Phase 2:** Manifold Markets import
- Creates 150+ short-term markets total

**Expected output:** 150+ markets

---

## Quick Start

### Option 1: Maximum Markets (Recommended)
```bash
# Generate 150+ markets using both sources
npx tsx scripts/mega-generate-150-markets.ts
```

### Option 2: Caribbean-Only Markets
```bash
# Generate 60-100 Caribbean-specific markets
npx tsx scripts/generate-short-term-markets.ts
```

### Option 3: Global Trending Markets
```bash
# Import 20-50 global trending markets
npx tsx scripts/import-from-manifold.ts
```

### Option 4: Combo Approach
```bash
# Run both separately
npx tsx scripts/generate-short-term-markets.ts
npx tsx scripts/import-from-manifold.ts
```

---

## Category Breakdown

New exciting categories:

- **Sports** - Cricket, football matches, regional tournaments
- **Crypto** - Bitcoin/crypto price predictions (short-term)
- **Weather** - Rain forecasts, hurricane warnings
- **Politics** - Policy announcements, ministerial statements
- **Pop Culture** - Viral moments, music releases, social trends
- **Breaking News** - Urgent announcements, developing stories
- **Business** - Stock movements, company announcements
- **Social** - Trending topics, viral predictions
- **Technology** - Product launches, tech announcements
- **Entertainment** - Events, performances, releases

---

## Examples of Good Questions

✅ **Sports:** "Will Jamaica's cricket team win against Barbados this Saturday?"
✅ **Crypto:** "Will Bitcoin close above $95k this Sunday?"
✅ **Weather:** "Will Kingston get more than 2 inches of rain by Friday?"
✅ **Politics:** "Will Trinidad's PM make a statement about the new policy this week?"
✅ **Pop Culture:** "Will [Caribbean artist]'s new song hit 1M views by end of week?"
✅ **Breaking News:** "Will the hurricane warning be upgraded by Thursday?"

---

## Validation Rules

All markets MUST pass these checks:

1. **Date Range:** Close date must be 1-7 days from today
2. **Required Fields:** question, description, category, country, close_date, options, resolution_criteria
3. **Options:** At least 2 options (typically Yes/No)
4. **Category:** Must be one of the approved categories

Markets that don't meet these criteria are automatically rejected.

---

## Troubleshooting

### "Only generated X markets (target was 150+)"
- News might be sparse for some countries
- Try running `mega-generate-150-markets.ts` which combines both sources
- Run multiple times to accumulate more markets

### "Duplicates skipped"
- This is normal - prevents creating the same market twice
- Duplicates are checked by question text

### "No short-term markets found on Manifold"
- Manifold might not have many markets closing soon
- Focus on Claude generation instead
- Try again later when Manifold has more short-term markets

---

## Monitoring

Check how many markets you have:

```bash
npx tsx scripts/check-status.ts
```

Filter by close date to see short-term markets:

```sql
SELECT COUNT(*) FROM markets
WHERE close_date <= NOW() + INTERVAL '7 days';
```

---

## Environment Variables Required

Make sure these are set in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
BRAVE_API_KEY=your_brave_api_key
CLAUDE_API_KEY=your_claude_api_key
```

---

## Next Steps

1. Run `mega-generate-150-markets.ts` to get 150+ markets
2. Check the results at caribpredict.com
3. Markets will auto-resolve based on close_date
4. Run the script daily/weekly to keep fresh markets flowing

---

## Tips for Best Results

- **Run during active news cycles** (weekdays) for more Caribbean news
- **Check sports calendars** - more sports events = better sports questions
- **Combine both sources** - Claude for Caribbean-specific + Manifold for global
- **Run multiple times** - Accumulate markets over several runs
- **Review categories** - Make sure you're getting diverse topics

---

Built with ❤️ for CaribPredict
