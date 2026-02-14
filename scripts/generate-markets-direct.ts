#!/usr/bin/env tsx
/**
 * DIRECT MARKET GENERATOR
 * Creates Caribbean prediction markets without needing Claude API
 * Uses Brave Search for news + template-based question generation
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const braveApiKey = process.env.BRAVE_API_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface MarketTemplate {
  question: string;
  description: string;
  category: string;
  country: string;
  options: string[];
  daysUntilClose: number;
}

// Generate date strings
function futureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// Caribbean-specific market templates organized by category
const MARKET_TEMPLATES: MarketTemplate[] = [
  // === POLITICS ===
  { question: "Will Jamaica's parliament pass any new legislation before March 2026?", description: "Tracks legislative activity in Jamaica's parliament during the current session.", category: "Politics", country: "Jamaica", options: ["Yes", "No"], daysUntilClose: 14 },
  { question: "Will Trinidad and Tobago announce new energy sector reforms by March 2026?", description: "Trinidad is heavily dependent on oil/gas. Any policy changes to energy regulation count.", category: "Politics", country: "Trinidad and Tobago", options: ["Yes", "No"], daysUntilClose: 14 },
  { question: "Will Guyana's government announce new oil revenue distribution plans in February 2026?", description: "Guyana's oil boom has created debates about wealth distribution. Resolves if official announcement is made.", category: "Politics", country: "Guyana", options: ["Yes", "No"], daysUntilClose: 14 },
  { question: "Will any CARICOM nation hold a snap election in Q1 2026?", description: "Tracks whether any of the 15 CARICOM member states calls an unscheduled election.", category: "Politics", country: "All CARICOM", options: ["Yes", "No"], daysUntilClose: 45 },
  { question: "Will Barbados announce new diplomatic partnerships in February 2026?", description: "Barbados has been expanding international relationships since becoming a republic. Any new bilateral agreement counts.", category: "Politics", country: "Barbados", options: ["Yes", "No"], daysUntilClose: 14 },
  { question: "Will Haiti form a stable transitional government by March 2026?", description: "Haiti has been in political crisis. Resolves Yes if a government with broad support is formed.", category: "Politics", country: "Haiti", options: ["Yes", "No"], daysUntilClose: 30 },
  { question: "Will the Bahamas introduce new tax legislation in Q1 2026?", description: "The Bahamas has been discussing fiscal reforms. Any new tax bill introduced counts.", category: "Politics", country: "Bahamas", options: ["Yes", "No"], daysUntilClose: 45 },
  { question: "Will Belize's government announce new environmental protection measures by March 2026?", description: "Belize is known for its barrier reef and biodiversity. Any new conservation legislation counts.", category: "Politics", country: "Belize", options: ["Yes", "No"], daysUntilClose: 30 },
  { question: "Will Saint Lucia's prime minister make an official state visit to a non-CARICOM nation in February 2026?", description: "Tracks diplomatic travel by Saint Lucia's head of government.", category: "Politics", country: "Saint Lucia", options: ["Yes", "No"], daysUntilClose: 14 },
  { question: "Will Dominica announce new citizenship-by-investment program changes in 2026?", description: "Dominica's CBI program is a major revenue source. Any program modifications count.", category: "Politics", country: "Dominica", options: ["Yes", "No"], daysUntilClose: 60 },

  // === ECONOMICS ===
  { question: "Will Jamaica's JMD/USD exchange rate stay below 160 through February 2026?", description: "The Jamaican dollar has been fluctuating. Resolves based on official BOJ rates.", category: "Economics", country: "Jamaica", options: ["Yes", "No"], daysUntilClose: 14 },
  { question: "Will Guyana's GDP growth exceed 25% for 2025 (when officially reported)?", description: "Guyana has had extraordinary GDP growth due to oil. Resolves when IMF or official stats are published.", category: "Economics", country: "Guyana", options: ["Yes", "No"], daysUntilClose: 90 },
  { question: "Will Trinidad and Tobago's inflation rate decrease in January 2026 vs December 2025?", description: "Month-over-month CPI comparison. Resolves when CSO publishes official data.", category: "Economics", country: "Trinidad and Tobago", options: ["Yes", "No"], daysUntilClose: 30 },
  { question: "Will any Caribbean nation launch a CBDC pilot in Q1 2026?", description: "Several Caribbean nations have been exploring central bank digital currencies. The Bahamas already has Sand Dollar.", category: "Economics", country: "All CARICOM", options: ["Yes", "No"], daysUntilClose: 45 },
  { question: "Will Barbados attract over $500M in foreign direct investment in Q1 2026?", description: "Barbados has been positioning itself as a tech and business hub.", category: "Economics", country: "Barbados", options: ["Yes", "No"], daysUntilClose: 60 },
  { question: "Will the Bahamas tourism arrivals in January 2026 exceed January 2025?", description: "Tourism is the backbone of the Bahamian economy. Resolves when official stats are published.", category: "Economics", country: "Bahamas", options: ["Yes", "No"], daysUntilClose: 45 },
  { question: "Will Suriname's gold exports increase year-over-year in Q1 2026?", description: "Gold mining is a major industry in Suriname. Resolves based on official trade data.", category: "Economics", country: "Suriname", options: ["Yes", "No"], daysUntilClose: 60 },
  { question: "Will remittances to Jamaica exceed $300M in January 2026?", description: "Remittances are a crucial part of Jamaica's economy. Resolves when BOJ publishes data.", category: "Economics", country: "Jamaica", options: ["Yes", "No"], daysUntilClose: 45 },

  // === SPORTS ===
  { question: "Will a Caribbean athlete win a medal at the next major international athletics event?", description: "Caribbean sprinters and field athletes regularly compete at the highest level.", category: "Sports", country: "All CARICOM", options: ["Yes", "No"], daysUntilClose: 60 },
  { question: "Will West Indies win their next T20I cricket series?", description: "The West Indies cricket team's upcoming T20 international series.", category: "Sports", country: "All CARICOM", options: ["Yes", "No"], daysUntilClose: 30 },
  { question: "Which team will lead the Caribbean Premier League standings mid-season 2026?", description: "The CPL is the Caribbean's premier T20 cricket franchise league.", category: "Sports", country: "All CARICOM", options: ["Jamaica Tallawahs", "Trinidad Knight Riders", "Barbados Royals", "Guyana Amazon Warriors", "Other"], daysUntilClose: 120 },
  { question: "Will Jamaica produce a sub-10 second 100m sprinter in the first half of 2026?", description: "Jamaica has a rich tradition of world-class sprinting. Resolves if any Jamaican runs under 10s in an official race.", category: "Sports", country: "Jamaica", options: ["Yes", "No"], daysUntilClose: 120 },
  { question: "Will Trinidad and Tobago qualify for any FIFA tournament in 2026?", description: "Tracks T&T's football qualification campaigns.", category: "Sports", country: "Trinidad and Tobago", options: ["Yes", "No"], daysUntilClose: 180 },
  { question: "Will the Reggae Boyz (Jamaica) win their next CONCACAF match?", description: "Jamaica's national football team's upcoming competitive fixture.", category: "Sports", country: "Jamaica", options: ["Yes", "No"], daysUntilClose: 30 },
  { question: "Will a Caribbean boxer win a world title fight in Q1 2026?", description: "The Caribbean has produced many boxing champions. Resolves if any Caribbean-born boxer wins a major title.", category: "Sports", country: "All CARICOM", options: ["Yes", "No"], daysUntilClose: 45 },

  // === ENTERTAINMENT ===
  { question: "Will Trinidad Carnival 2026 break attendance records?", description: "Trinidad Carnival is the Caribbean's biggest cultural event. Resolves based on official tourism board numbers.", category: "Entertainment", country: "Trinidad and Tobago", options: ["Yes", "No"], daysUntilClose: 30 },
  { question: "Will a Caribbean artist reach the Billboard Hot 100 in Q1 2026?", description: "Caribbean music (dancehall, soca, reggae) continues to gain global popularity.", category: "Entertainment", country: "All CARICOM", options: ["Yes", "No"], daysUntilClose: 45 },
  { question: "Will Jamaica host a major international music festival in the first half of 2026?", description: "Jamaica is home to reggae and dancehall. Tracks festivals with 5000+ international attendees.", category: "Entertainment", country: "Jamaica", options: ["Yes", "No"], daysUntilClose: 120 },
  { question: "Will Crop Over festival in Barbados 2026 have more than 50,000 attendees?", description: "Barbados' biggest annual cultural celebration.", category: "Entertainment", country: "Barbados", options: ["Yes", "No"], daysUntilClose: 180 },
  { question: "Will a new Caribbean-produced film premiere at a major international film festival in 2026?", description: "Caribbean cinema is growing. Resolves if a Caribbean production screens at Cannes, TIFF, Sundance, or similar.", category: "Entertainment", country: "All CARICOM", options: ["Yes", "No"], daysUntilClose: 180 },

  // === TECHNOLOGY ===
  { question: "Will any CARICOM nation announce a national AI strategy in 2026?", description: "Caribbean nations are increasingly looking at AI and digital transformation.", category: "Technology", country: "All CARICOM", options: ["Yes", "No"], daysUntilClose: 180 },
  { question: "Will Barbados' tech sector attract a major international tech company to open offices in 2026?", description: "Barbados has been marketing its Welcome Stamp program to digital nomads and tech companies.", category: "Technology", country: "Barbados", options: ["Yes", "No"], daysUntilClose: 180 },
  { question: "Will Jamaica's digital identity system launch by mid-2026?", description: "Jamaica has been developing a national digital ID system (NIDS).", category: "Technology", country: "Jamaica", options: ["Yes", "No"], daysUntilClose: 120 },
  { question: "Will submarine cable internet speeds improve across the Caribbean in 2026?", description: "Several new submarine cable projects have been announced for the region.", category: "Technology", country: "All CARICOM", options: ["Yes", "No"], daysUntilClose: 180 },

  // === WEATHER ===
  { question: "Will the 2026 Atlantic hurricane season be above average?", description: "NOAA forecasts predict hurricane activity. Resolves based on official NOAA seasonal outlook.", category: "Weather", country: "All CARICOM", options: ["Yes", "No"], daysUntilClose: 180 },
  { question: "Will any Caribbean island experience a Category 3+ hurricane in 2026?", description: "The Caribbean is highly vulnerable to tropical storms and hurricanes.", category: "Weather", country: "All CARICOM", options: ["Yes", "No"], daysUntilClose: 270 },
  { question: "Will Jamaica experience drought conditions in Q1 2026?", description: "Jamaica periodically faces water scarcity issues.", category: "Weather", country: "Jamaica", options: ["Yes", "No"], daysUntilClose: 45 },
  { question: "Will Barbados record above-average rainfall in February 2026?", description: "Barbados weather tracking. Resolves based on Met Office data.", category: "Weather", country: "Barbados", options: ["Yes", "No"], daysUntilClose: 14 },
  { question: "Will Trinidad experience flooding in the wet season 2026?", description: "Trinidad frequently experiences flooding during heavy rains.", category: "Weather", country: "Trinidad and Tobago", options: ["Yes", "No"], daysUntilClose: 180 },

  // === CRYPTO ===
  { question: "Will Bitcoin exceed $120,000 by March 2026?", description: "Bitcoin price prediction. Resolves based on CoinGecko spot price.", category: "Crypto", country: "All CARICOM", options: ["Yes", "No"], daysUntilClose: 30 },
  { question: "Will any Caribbean central bank ban cryptocurrency in 2026?", description: "Some nations have been considering crypto regulation. A full ban would be significant.", category: "Crypto", country: "All CARICOM", options: ["Yes", "No"], daysUntilClose: 180 },
  { question: "Will the Bahamas Sand Dollar (CBDC) reach 100,000 active users by mid-2026?", description: "The Sand Dollar is one of the world's first CBDCs.", category: "Crypto", country: "Bahamas", options: ["Yes", "No"], daysUntilClose: 120 },
  { question: "Will Bitcoin Lightning Network adoption grow in the Caribbean in 2026?", description: "Lightning enables cheap, fast Bitcoin payments ideal for Caribbean remittances.", category: "Crypto", country: "All CARICOM", options: ["Yes", "No"], daysUntilClose: 180 },
  { question: "Will Ethereum stay above $3,000 through February 2026?", description: "Ethereum price tracking. Resolves based on whether ETH dips below $3K at any point.", category: "Crypto", country: "All CARICOM", options: ["Yes", "No"], daysUntilClose: 14 },

  // === CULTURE ===
  { question: "Will reggae or dancehall be nominated for a Grammy in 2027 (announced late 2026)?", description: "Caribbean music genres at the Grammys.", category: "Culture", country: "Jamaica", options: ["Yes", "No"], daysUntilClose: 270 },
  { question: "Will UNESCO add a new Caribbean cultural site to the World Heritage List in 2026?", description: "The Caribbean has many cultural treasures worthy of UNESCO recognition.", category: "Culture", country: "All CARICOM", options: ["Yes", "No"], daysUntilClose: 270 },
  { question: "Will Rihanna release new music in 2026?", description: "The Barbadian superstar has been on a music hiatus. Resolves if a new single or album drops.", category: "Culture", country: "Barbados", options: ["Yes", "No"], daysUntilClose: 270 },
  { question: "Will a Caribbean food dish go viral on social media in Q1 2026?", description: "Caribbean cuisine (jerk chicken, doubles, roti) periodically trends globally.", category: "Culture", country: "All CARICOM", options: ["Yes", "No"], daysUntilClose: 45 },

  // === BUSINESS ===
  { question: "Will a new international airline announce Caribbean routes in Q1 2026?", description: "Caribbean tourism depends heavily on air connectivity.", category: "Economics", country: "All CARICOM", options: ["Yes", "No"], daysUntilClose: 45 },
  { question: "Will Guyana award new oil exploration blocks in Q1 2026?", description: "Guyana's Stabroek block has transformed the economy. New exploration blocks are regularly awarded.", category: "Economics", country: "Guyana", options: ["Yes", "No"], daysUntilClose: 45 },
  { question: "Will GraceKennedy (Jamaica) report increased Q4 2025 revenue?", description: "GraceKennedy is one of the Caribbean's largest conglomerates.", category: "Economics", country: "Jamaica", options: ["Yes", "No"], daysUntilClose: 60 },
  { question: "Will Sandals Resorts announce a new Caribbean property in 2026?", description: "Sandals is the Caribbean's largest all-inclusive resort chain.", category: "Economics", country: "All CARICOM", options: ["Yes", "No"], daysUntilClose: 180 },

  // === MORE SHORT-TERM (1-7 days) ===
  { question: "Will Bitcoin price be higher on February 21 than February 14, 2026?", description: "One-week Bitcoin price movement prediction.", category: "Crypto", country: "All CARICOM", options: ["Yes", "No"], daysUntilClose: 7 },
  { question: "Will any CARICOM leader make international headlines this week?", description: "Tracks major international media coverage of Caribbean leaders.", category: "Politics", country: "All CARICOM", options: ["Yes", "No"], daysUntilClose: 7 },
  { question: "Will Jamaica's stock market index close higher this week than last?", description: "Jamaica Stock Exchange weekly performance.", category: "Economics", country: "Jamaica", options: ["Yes", "No"], daysUntilClose: 5 },
  { question: "Will Trinidad Carnival preparations make international news this week?", description: "As Carnival approaches, media coverage intensifies.", category: "Entertainment", country: "Trinidad and Tobago", options: ["Yes", "No"], daysUntilClose: 7 },
  { question: "Will the Caribbean weather remain storm-free through the end of February 2026?", description: "Tracking tropical weather activity in the region.", category: "Weather", country: "All CARICOM", options: ["Yes", "No"], daysUntilClose: 14 },
  { question: "Will any Caribbean cryptocurrency exchange report record volume this month?", description: "Crypto trading activity in the Caribbean.", category: "Crypto", country: "All CARICOM", options: ["Yes", "No"], daysUntilClose: 14 },

  // === GRENADA, ST VINCENT, ANTIGUA, ST KITTS, MONTSERRAT specific ===
  { question: "Will Grenada's nutmeg exports increase in Q1 2026?", description: "Grenada is known as the 'Spice Isle' and is a major nutmeg producer.", category: "Economics", country: "Grenada", options: ["Yes", "No"], daysUntilClose: 60 },
  { question: "Will Saint Vincent's La Soufriere volcano show increased activity in 2026?", description: "La Soufriere erupted in 2021. Seismologists continue monitoring.", category: "Weather", country: "Saint Vincent and the Grenadines", options: ["Yes", "No"], daysUntilClose: 180 },
  { question: "Will Antigua and Barbuda's tourism revenue exceed 2025 levels?", description: "Tourism is the primary economic driver for Antigua and Barbuda.", category: "Economics", country: "Antigua and Barbuda", options: ["Yes", "No"], daysUntilClose: 270 },
  { question: "Will Saint Kitts and Nevis update its CBI program requirements in 2026?", description: "St Kitts has the oldest citizenship-by-investment program in the world.", category: "Politics", country: "Saint Kitts and Nevis", options: ["Yes", "No"], daysUntilClose: 180 },
  { question: "Will Montserrat's population exceed 5,000 residents by end of 2026?", description: "Montserrat's population has been slowly recovering since the 1995 volcanic eruption.", category: "Culture", country: "Montserrat", options: ["Yes", "No"], daysUntilClose: 270 },
  { question: "Will Suriname's new offshore oil discoveries attract additional investment in 2026?", description: "Suriname has been making significant offshore oil discoveries following Guyana's lead.", category: "Economics", country: "Suriname", options: ["Yes", "No"], daysUntilClose: 180 },
];

async function createMarket(template: MarketTemplate): Promise<boolean> {
  try {
    // Check for duplicate
    const { data: existing } = await supabase
      .from('markets')
      .select('id')
      .eq('question', template.question)
      .single();

    if (existing) {
      console.log(`  ⏭  Skipping duplicate: ${template.question.substring(0, 60)}...`);
      return false;
    }

    const closeDate = futureDate(template.daysUntilClose);

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

    // Create options
    const optionInserts = template.options.map((label, idx) => ({
      market_id: market.id,
      label,
      total_shares: 0,
      probability: 1.0 / template.options.length,
    }));

    const { error: optionsError } = await supabase
      .from('market_options')
      .insert(optionInserts);

    if (optionsError) throw optionsError;

    console.log(`  ✅ Created: ${template.question.substring(0, 70)}...`);
    return true;
  } catch (err: any) {
    console.error(`  ❌ Error: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('🚀 DIRECT MARKET GENERATOR: Caribbean Prediction Markets');
  console.log('='.repeat(80));
  console.log(`Templates: ${MARKET_TEMPLATES.length} markets to create`);
  console.log(`Date: ${new Date().toISOString()}`);
  console.log('='.repeat(80));

  // Check current market count
  const { count: existingCount } = await supabase
    .from('markets')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Current markets in database: ${existingCount}`);
  console.log(`📝 New markets to create: ${MARKET_TEMPLATES.length}\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const template of MARKET_TEMPLATES) {
    const result = await createMarket(template);
    if (result) created++;
    else skipped++;
  }

  // Final count
  const { count: finalCount } = await supabase
    .from('markets')
    .select('*', { count: 'exact', head: true });

  console.log('\n' + '='.repeat(80));
  console.log('📊 RESULTS');
  console.log('='.repeat(80));
  console.log(`  Created: ${created} new markets`);
  console.log(`  Skipped: ${skipped} (duplicates or errors)`);
  console.log(`  Total markets now: ${finalCount}`);
  console.log('='.repeat(80));
}

main().catch(console.error);
