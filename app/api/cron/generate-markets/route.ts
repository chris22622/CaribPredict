/**
 * Cron API Route: Generate fresh Caribbean markets daily
 * Called by Vercel Cron or manually via GET /api/cron/generate-markets
 * Generates markets from templates without requiring Claude API
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Auth secret to protect the cron endpoint
const CRON_SECRET = process.env.CRON_SECRET || 'caribpredict-cron-2026';

interface MarketTemplate {
  question: string;
  description: string;
  category: string;
  country: string;
  options: string[];
  daysUntilClose: number;
}

function futureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function getDateStr(): string {
  return new Date().toISOString().split('T')[0];
}

// Dynamic market templates that change based on date
function getDailyMarkets(): MarketTemplate[] {
  const today = new Date();
  const month = today.toLocaleString('en-US', { month: 'long' });
  const year = today.getFullYear();
  const weekNum = Math.ceil((today.getDate()) / 7);

  const countries = [
    'Jamaica', 'Trinidad and Tobago', 'Barbados', 'Guyana', 'Bahamas',
    'Suriname', 'Haiti', 'Belize', 'Dominica', 'Grenada',
    'Saint Lucia', 'Saint Vincent and the Grenadines', 'Antigua and Barbuda',
    'Saint Kitts and Nevis', 'Montserrat'
  ];

  // Rotate through countries based on day of month
  const dayOfMonth = today.getDate();
  const primaryCountry = countries[dayOfMonth % countries.length];
  const secondaryCountry = countries[(dayOfMonth + 7) % countries.length];

  const templates: MarketTemplate[] = [
    // Daily crypto market (always relevant)
    {
      question: `Will Bitcoin close above its current price on ${futureDate(7)}?`,
      description: `Weekly Bitcoin price prediction. Resolves based on CoinGecko spot price at midnight UTC on ${futureDate(7)}.`,
      category: 'Crypto',
      country: 'All CARICOM',
      options: ['Yes', 'No'],
      daysUntilClose: 7,
    },
    // Country-specific daily markets
    {
      question: `Will ${primaryCountry} make international headlines in the next 7 days?`,
      description: `Tracks whether ${primaryCountry} appears in a major international news outlet (BBC, CNN, Reuters, AP) headline within the next week.`,
      category: 'Politics',
      country: primaryCountry,
      options: ['Yes', 'No'],
      daysUntilClose: 7,
    },
    {
      question: `Will ${secondaryCountry}'s tourism sector report positive news this week?`,
      description: `Tracks any positive tourism announcements (new flights, hotel openings, visitor records) from ${secondaryCountry}.`,
      category: 'Economics',
      country: secondaryCountry,
      options: ['Yes', 'No'],
      daysUntilClose: 7,
    },
    // Weekly regional markets
    {
      question: `Will CARICOM issue a joint statement on any regional matter this week?`,
      description: `Tracks whether the CARICOM secretariat or heads of government issue any collective statements or agreements.`,
      category: 'Politics',
      country: 'All CARICOM',
      options: ['Yes', 'No'],
      daysUntilClose: 7,
    },
    {
      question: `Will any Caribbean nation report a natural disaster event this week?`,
      description: `Tracks earthquakes, floods, storms, or volcanic activity across CARICOM nations. Minor weather events don't count.`,
      category: 'Weather',
      country: 'All CARICOM',
      options: ['Yes', 'No'],
      daysUntilClose: 7,
    },
  ];

  return templates;
}

export async function GET(request: NextRequest) {
  // Verify cron authorization
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    // Also allow Vercel cron header
    const cronHeader = request.headers.get('x-vercel-cron');
    if (!cronHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const templates = getDailyMarkets();
  let created = 0;
  let skipped = 0;

  for (const template of templates) {
    try {
      // Check for duplicate (exact question match)
      const { data: existing } = await supabase
        .from('markets')
        .select('id')
        .eq('question', template.question)
        .single();

      if (existing) {
        skipped++;
        continue;
      }

      const closeDate = futureDate(template.daysUntilClose);
      const prob = 1.0 / template.options.length;

      const { data: market, error: marketError } = await supabase
        .from('markets')
        .insert({
          question: template.question,
          description: template.description,
          country_filter: template.country,
          category: template.category,
          close_date: closeDate,
          resolved: false,
          liquidity_parameter: 100,
        })
        .select()
        .single();

      if (marketError) throw marketError;

      const { error: optionsError } = await supabase
        .from('market_options')
        .insert(
          template.options.map(label => ({
            market_id: market.id,
            label,
            total_shares: 0,
            probability: prob,
          }))
        );

      if (optionsError) throw optionsError;
      created++;
    } catch (err: any) {
      console.error(`Error creating market: ${err.message}`);
    }
  }

  // Get total count
  const { count } = await supabase
    .from('markets')
    .select('*', { count: 'exact', head: true })
    .eq('resolved', false);

  return NextResponse.json({
    success: true,
    created,
    skipped,
    totalActive: count,
    date: getDateStr(),
  });
}
