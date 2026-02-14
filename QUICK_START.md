# Quick Start Guide: Auto-Question Generation

## Test the System (5 minutes)

### Step 1: Generate Questions for One Country

```bash
npm run generate-questions:country Jamaica
```

Expected output:
- Fetches 10 recent news articles about Jamaica
- Generates 2-3 prediction market questions
- Saves to database with status "pending"

### Step 2: Review in Admin Panel

1. Start dev server: `npm run dev`
2. Navigate to: `http://localhost:3000/admin/questions`
3. You'll see:
   - Pending questions from Jamaica
   - Source news articles
   - Generated question details

### Step 3: Approve a Question

1. Click "Expand" on a question to see full details
2. Review the question quality:
   - Is it clear and answerable?
   - Are the resolution criteria specific?
   - Is the close date reasonable?
3. Click "Approve" to create a live market
4. The question becomes a real market at `/`

### Step 4: Verify Market Created

1. Go to homepage: `http://localhost:3000/`
2. You should see the newly created market
3. Users can now trade on it!

## Generate for All Countries

Once you're comfortable with the system:

```bash
npm run generate-questions
```

This will:
- Process all 15 CARICOM countries
- Generate 30-45 questions total
- Take ~5-8 minutes to complete
- Save all questions to the queue for review

## Cron Schedule (Production)

### Daily Generation (9 AM)
```cron
0 9 * * * cd /path/to/CaribPredict && npm run generate-questions
```

### Weekly Generation (Monday 9 AM)
```cron
0 9 * * 1 cd /path/to/CaribPredict && npm run generate-questions
```

## Monitoring

### Check Queue Status
```bash
curl http://localhost:3000/api/auto-generate
```

### View Pending Count
SQL:
```sql
SELECT COUNT(*) FROM question_queue WHERE status = 'pending';
```

## Common Issues

### "BRAVE_API_KEY not set"
Add to `.env.local`:
```env
BRAVE_API_KEY=your_key_here
```

### "CLAUDE_API_KEY not set"
Add to `.env.local`:
```env
CLAUDE_API_KEY=sk-ant-api03-...
```

### No questions generated
- Check API keys are valid
- Check internet connection
- Try with verbose logging: add `console.log()` in scripts

### Admin page not loading
- Start dev server: `npm run dev`
- Check database connection
- Verify Supabase credentials

## Next Steps

1. Test with more countries
2. Set up weekly cron job
3. Create process for reviewing questions
4. Monitor question quality over time
5. Adjust Claude prompt if needed

## API Usage

### Generate via API
```bash
curl -X POST http://localhost:3000/api/auto-generate \
  -H "Content-Type: application/json" \
  -d '{"country":"Jamaica","daysBack":7}'
```

### Check Status
```bash
curl http://localhost:3000/api/auto-generate
```

## Success Metrics

After 1 week of automation:
- 30-45 questions generated per run
- 70%+ approval rate (adjust prompt if lower)
- 2-3 questions per country on average
- Diverse categories (politics, sports, economics, etc.)

## Tips

1. **Start Small**: Test with 1-2 countries first
2. **Review Quality**: Check first few batches carefully
3. **Adjust Prompts**: Modify Claude prompt in `lib/claude-generator.ts` if needed
4. **Rate Limits**: Don't run too frequently (max once per day)
5. **API Costs**: Monitor Claude API usage (should be <$1/month)

## Support

Issues? Check:
1. Console logs for errors
2. Database for saved questions
3. API keys are valid
4. Supabase connection works
5. Environment variables loaded correctly
