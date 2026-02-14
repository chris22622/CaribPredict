# CaribPredict Auto-Question Generation - Usage Guide

## Daily Operations

### Check System Status
```bash
npm run check-status
```

This shows:
- Environment variable status
- Question queue counts (pending/approved/rejected)
- Pending questions by country
- Recent generations
- Total markets created
- Recommendations for next steps

### Generate Questions

#### For Single Country
```bash
npm run generate-questions:country Jamaica
```

#### For All 15 CARICOM Countries
```bash
npm run generate-questions
```

Time estimate:
- Single country: ~15-20 seconds
- All countries: ~5-8 minutes

### Review & Approve Questions

1. Start dev server (if not running):
   ```bash
   npm run dev
   ```

2. Open browser: `http://localhost:3000/admin/questions`

3. Review pending questions:
   - Click "Expand" to see details and source articles
   - Click "Approve" to create a live market
   - Click "Reject" to dismiss

4. Filter by status:
   - Pending: New questions waiting for review
   - Approved: Questions that became markets
   - Rejected: Dismissed questions
   - All: Everything

## Weekly Workflow

### Recommended Schedule

**Monday Morning (9 AM)**
1. Generate questions for all countries
   ```bash
   npm run generate-questions
   ```

2. Review output in terminal:
   - Articles fetched per country
   - Questions generated per country
   - Any errors or warnings

3. Check status:
   ```bash
   npm run check-status
   ```

**Monday Afternoon**
4. Review questions in admin panel:
   - Visit `/admin/questions`
   - Review each country's questions
   - Approve high-quality questions
   - Reject poor-quality questions

**Throughout Week**
5. Monitor live markets:
   - Check if markets are attracting trades
   - Note which categories are most popular
   - Identify countries with less engagement

## Quality Control

### Approve Questions That:
- ✅ Have clear, unambiguous wording
- ✅ Can be resolved with public information
- ✅ Have specific resolution criteria
- ✅ Are interesting/relevant to Caribbean users
- ✅ Have reasonable close dates (30-180 days)
- ✅ Avoid sensitive topics (violence, death, disasters)
- ✅ Cover diverse categories (not all sports, not all politics)

### Reject Questions That:
- ❌ Are vague or unclear
- ❌ Can't be objectively resolved
- ❌ Rely on private information
- ❌ Are too speculative or far in future
- ❌ Cover sensitive topics
- ❌ Are duplicates of existing markets
- ❌ Have grammatical errors or poor formatting

## Automation Setup

### Linux/Mac Cron

Edit crontab:
```bash
crontab -e
```

Add for weekly Monday 9 AM generation:
```cron
0 9 * * 1 cd /path/to/CaribPredict && npm run generate-questions >> /var/log/caribpredict-generation.log 2>&1
```

Add for daily generation at 9 AM:
```cron
0 9 * * * cd /path/to/CaribPredict && npm run generate-questions >> /var/log/caribpredict-generation.log 2>&1
```

View logs:
```bash
tail -f /var/log/caribpredict-generation.log
```

### Windows Task Scheduler

1. Open Task Scheduler
2. Create Basic Task → Name: "CaribPredict Question Generation"
3. Trigger: Weekly (or Daily)
4. Time: 9:00 AM
5. Action: Start a program
6. Program: `cmd.exe`
7. Arguments: `/c cd "D:\Bot Projects\CaribPredict" && npm run generate-questions >> logs\generation.log 2>&1`
8. Save

## API Usage

### Check Status (GET)
```bash
curl http://localhost:3000/api/auto-generate
```

Response:
```json
{
  "status": "ok",
  "queue": {
    "pending": 15,
    "approved": 8,
    "rejected": 2
  },
  "supportedCountries": ["Jamaica", "Trinidad and Tobago", ...]
}
```

### Generate Questions (POST)
```bash
# All countries
curl -X POST http://localhost:3000/api/auto-generate

# Single country
curl -X POST http://localhost:3000/api/auto-generate \
  -H "Content-Type: application/json" \
  -d '{"country":"Jamaica","daysBack":7}'
```

Response:
```json
{
  "success": true,
  "summary": {
    "countriesProcessed": 1,
    "totalArticlesFetched": 10,
    "totalQuestionsGenerated": 3,
    "savedToQueue": 1
  },
  "details": [
    {
      "country": "Jamaica",
      "questionsCount": 3,
      "queueId": "uuid-here"
    }
  ]
}
```

## Database Queries

### Check Pending Questions
```sql
SELECT
  country,
  COUNT(*) as pending_count,
  SUM(jsonb_array_length(generated_questions)) as total_questions
FROM question_queue
WHERE status = 'pending'
GROUP BY country
ORDER BY pending_count DESC;
```

### View Recent Generations
```sql
SELECT
  country,
  status,
  jsonb_array_length(generated_questions) as question_count,
  created_at
FROM question_queue
ORDER BY created_at DESC
LIMIT 10;
```

### Check Approval Rate
```sql
SELECT
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM question_queue
GROUP BY status;
```

### View Questions from Specific Queue Item
```sql
SELECT
  country,
  generated_questions,
  raw_news
FROM question_queue
WHERE id = 'queue-id-here';
```

## Monitoring & Metrics

### Key Metrics to Track

1. **Generation Rate**
   - Questions generated per run
   - Target: 30-45 per full run (all countries)

2. **Approval Rate**
   - Approved / Total generated
   - Target: >70%

3. **Category Distribution**
   - Politics, Sports, Economics, etc.
   - Target: Diverse mix

4. **Country Coverage**
   - Questions per country
   - Target: 2-3 per country

5. **API Costs**
   - Claude API usage
   - Target: <$1/month for weekly runs

6. **Market Performance**
   - Trades per market
   - User engagement
   - Popular categories

### Weekly Report Template

```
CaribPredict Auto-Generation Report
Week of: [Date]

Generation Stats:
- Runs executed: X
- Total questions generated: X
- Questions approved: X (X%)
- Questions rejected: X (X%)
- Active markets created: X

By Country:
- Jamaica: X questions, X approved
- Trinidad and Tobago: X questions, X approved
[...]

By Category:
- Politics: X questions
- Sports: X questions
- Economics: X questions
[...]

Top Performing Markets:
1. [Market question] - X trades
2. [Market question] - X trades
3. [Market question] - X trades

Issues/Notes:
- [Any problems encountered]
- [Quality concerns]
- [Suggestions for improvement]

Next Steps:
- [Action items]
```

## Troubleshooting

### No Questions Generated

**Check:**
1. API keys valid?
   ```bash
   npm run check-status
   ```

2. Internet connection working?
   ```bash
   ping api.search.brave.com
   ```

3. Articles being fetched?
   - Look at console output for article counts
   - If 0 articles, Brave API may have issues

4. Claude API responding?
   - Check for error messages in output
   - Verify API key hasn't expired

### Poor Question Quality

**Actions:**
1. Review Claude prompt in `lib/claude-generator.ts`
2. Adjust temperature (currently 0.7)
3. Modify instructions for clarity
4. Add examples of good questions
5. Increase context about Caribbean region

### Database Errors

**Check:**
1. Supabase connection
   ```bash
   npm run check-status
   ```

2. Service role key valid?
3. question_queue table exists?
4. Row-level security policies correct?

### API Rate Limits

**Symptoms:**
- 429 errors
- "Too many requests" messages

**Solutions:**
1. Increase delay between requests
2. Run less frequently
3. Upgrade API plan if needed
4. Implement exponential backoff

### Admin Page Not Loading

**Check:**
1. Dev server running?
   ```bash
   npm run dev
   ```

2. Browser console for errors
3. Supabase connection
4. React components rendering

## Best Practices

1. **Start Small**
   - Test with 1-2 countries first
   - Verify quality before scaling up

2. **Review Regularly**
   - Check pending questions at least weekly
   - Monitor approval rates

3. **Adjust Prompts**
   - Refine Claude instructions based on output
   - Add country-specific context if needed

4. **Monitor Costs**
   - Track Claude API usage
   - Set up billing alerts

5. **Engage Community**
   - Ask users which questions are interesting
   - Use feedback to improve generation

6. **Diversify Sources**
   - Consider adding more news sources beyond Brave
   - Mix official sources with popular media

7. **Quality Over Quantity**
   - Better to have 20 great questions than 50 mediocre ones
   - Reject liberally, approve selectively

## Advanced Usage

### Custom News Sources

Modify `lib/brave-search.ts` to:
- Add specific news domain filters
- Prioritize certain sources
- Exclude low-quality sources

### Prompt Refinement

Edit `lib/claude-generator.ts` to:
- Add examples of ideal questions
- Specify Caribbean context more clearly
- Adjust tone and style
- Focus on specific categories

### Batch Approval

For trusted categories/countries:
- Could add auto-approval logic
- Set confidence thresholds
- Still review periodically

### Analytics Integration

Add tracking:
- Most popular categories
- Best-performing countries
- User engagement metrics
- Approval/rejection reasons

## Support & Resources

- **Documentation**: `AUTO_GENERATION_README.md`
- **Quick Start**: `QUICK_START.md`
- **Test Checklist**: `TEST_CHECKLIST.md`
- **File Structure**: `FILE_STRUCTURE.txt`
- **Implementation Summary**: `IMPLEMENTATION_SUMMARY.md`

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run generate-questions` | Generate for all countries |
| `npm run generate-questions:country Jamaica` | Generate for one country |
| `npm run check-status` | Check system status |
| `npm run dev` | Start dev server |
| Visit `/admin/questions` | Review & approve |
| `curl http://localhost:3000/api/auto-generate` | Check API status |

---

**Last Updated**: 2026-02-09
**System Version**: 1.0.0
**Status**: Production Ready ✅
