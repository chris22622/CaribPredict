/**
 * Seed script to create sample prediction markets
 * Run with: npx tsx scripts/seed-markets.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const sampleMarkets = [
  {
    question: 'Will Jamaica win gold in 100m at 2026 Commonwealth Games?',
    description: 'Track and field prediction for the upcoming Commonwealth Games in Victoria, Australia.',
    country: 'Jamaica',
    category: 'Sports',
    close_date: new Date('2026-07-24').toISOString(),
    options: ['Yes', 'No'],
    liquidity_parameter: 100,
  },
  {
    question: 'Will Trinidad and Tobago GDP growth exceed 3% in 2026?',
    description: 'Economic prediction based on IMF and local forecasts.',
    country: 'Trinidad and Tobago',
    category: 'Economics',
    close_date: new Date('2026-12-31').toISOString(),
    options: ['Yes', 'No'],
    liquidity_parameter: 150,
  },
  {
    question: 'Who will win the 2026 CPL Cricket Championship?',
    description: 'Caribbean Premier League T20 cricket tournament winner.',
    country: 'All CARICOM',
    category: 'Sports',
    close_date: new Date('2026-09-15').toISOString(),
    options: [
      'Barbados Royals',
      'Jamaica Tallawahs',
      'Guyana Amazon Warriors',
      'Trinidad & Tobago Knight Riders',
      'Other',
    ],
    liquidity_parameter: 200,
  },
  {
    question: 'Will Barbados host a major tech conference in 2026?',
    description: 'Prediction on Barbados emerging as a tech hub for international events.',
    country: 'Barbados',
    category: 'Technology',
    close_date: new Date('2026-11-30').toISOString(),
    options: ['Yes', 'No'],
    liquidity_parameter: 100,
  },
  {
    question: 'Will CARICOM sign a new trade agreement with the EU in 2026?',
    description: 'Regional trade and economic development prediction.',
    country: 'All CARICOM',
    category: 'Politics',
    close_date: new Date('2026-12-31').toISOString(),
    options: ['Yes', 'No'],
    liquidity_parameter: 150,
  },
];

async function seedMarkets() {
  console.log('🌴 Starting CaribPredict market seeding...\n');

  for (const marketData of sampleMarkets) {
    try {
      // Create market
      const { data: market, error: marketError } = await supabase
        .from('markets')
        .insert({
          question: marketData.question,
          description: marketData.description,
          country_filter: marketData.country,
          category: marketData.category,
          close_date: marketData.close_date,
          resolved: false,
          liquidity_parameter: marketData.liquidity_parameter,
        })
        .select()
        .single();

      if (marketError) {
        console.error(`❌ Failed to create market: ${marketData.question}`);
        console.error(marketError);
        continue;
      }

      console.log(`✅ Created market: ${marketData.question}`);

      // Create options
      const optionsToInsert = marketData.options.map((optionText, index) => ({
        market_id: market.id,
        label: optionText,
        probability: (1 / marketData.options.length).toFixed(4),
        total_shares: 0,
      }));

      const { error: optionsError } = await supabase
        .from('market_options')
        .insert(optionsToInsert);

      if (optionsError) {
        console.error(`❌ Failed to create options for: ${marketData.question}`);
        console.error(optionsError);
      } else {
        console.log(`   📊 Created ${marketData.options.length} options\n`);
      }
    } catch (error) {
      console.error(`❌ Error seeding market: ${marketData.question}`, error);
    }
  }

  console.log('🎉 Seeding complete!');
}

seedMarkets().catch(console.error);
