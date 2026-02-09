/**
 * Manifold Markets API Integration
 * Fetches trending markets and adapts them for Caribbean context
 */

export interface ManifoldMarket {
  id: string;
  question: string;
  description: string;
  creatorUsername: string;
  createdTime: number;
  closeTime: number;
  isResolved: boolean;
  outcomeType: string;
  mechanism: string;
  volume24Hours: number;
  volume7Days: number;
  totalLiquidity: number;
  probability?: number;
  url: string;
}

export interface ManifoldMarketsResponse {
  markets: ManifoldMarket[];
}

export interface AdaptedMarket {
  question: string;
  description: string;
  category: string;
  country: string;
  close_date: string;
  options: string[];
  resolution_criteria: string;
  liquidity_parameter: number;
  source: string;
}

/**
 * Fetch trending markets from Manifold Markets
 * @param limit - Number of markets to fetch (default: 100)
 * @param sort - Sort method (default: '24-hour-volume')
 * @returns Array of Manifold markets
 */
export async function fetchTrendingMarkets(
  limit: number = 100,
  sort: string = '24-hour-volume'
): Promise<ManifoldMarket[]> {
  try {
    const response = await fetch(
      `https://api.manifold.markets/v0/markets?limit=${limit}&sort=${sort}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Manifold API error: ${response.status} - ${errorText}`);
    }

    const markets: ManifoldMarket[] = await response.json();
    return markets;
  } catch (error) {
    console.error('Error fetching Manifold markets:', error);
    throw error;
  }
}

/**
 * Filter markets to only include short-term ones (closing within 7 days)
 */
export function filterShortTermMarkets(markets: ManifoldMarket[]): ManifoldMarket[] {
  const now = Date.now();
  const sevenDaysFromNow = now + (7 * 24 * 60 * 60 * 1000);

  return markets.filter(market => {
    return (
      !market.isResolved &&
      market.closeTime > now &&
      market.closeTime <= sevenDaysFromNow &&
      market.outcomeType === 'BINARY'
    );
  });
}

/**
 * Determine category based on market question
 */
function categorizeMarket(question: string): string {
  const lowerQ = question.toLowerCase();

  if (lowerQ.match(/bitcoin|crypto|eth|btc|price|coin/)) return 'Crypto';
  if (lowerQ.match(/win|match|game|team|sports|football|cricket|basketball/)) return 'Sports';
  if (lowerQ.match(/weather|rain|storm|hurricane|temperature|wind/)) return 'Weather';
  if (lowerQ.match(/election|president|minister|government|politics|vote/)) return 'Politics';
  if (lowerQ.match(/stock|market|economy|gdp|inflation|business|company/)) return 'Business';
  if (lowerQ.match(/viral|trending|views|social|twitter|tiktok/)) return 'Social';
  if (lowerQ.match(/movie|music|artist|celebrity|entertainment|album|song/)) return 'Pop Culture';
  if (lowerQ.match(/breaking|news|announce|report/)) return 'Breaking News';
  if (lowerQ.match(/tech|ai|software|app|launch/)) return 'Technology';

  return 'Politics'; // Default category
}

/**
 * Caribbean countries for market adaptation
 */
const CARIBBEAN_COUNTRIES = [
  'Jamaica',
  'Trinidad and Tobago',
  'Barbados',
  'The Bahamas',
  'Saint Lucia',
  'Grenada',
  'Saint Vincent and the Grenadines',
  'Antigua and Barbuda',
  'Dominica',
  'Saint Kitts and Nevis',
  'Belize',
  'Guyana',
  'Suriname',
  'Haiti',
  'Dominican Republic',
];

/**
 * Get random Caribbean country
 */
function getRandomCaribCountry(): string {
  return CARIBBEAN_COUNTRIES[Math.floor(Math.random() * CARIBBEAN_COUNTRIES.length)];
}

/**
 * Adapt a Manifold market for Caribbean context
 * @param market - Original Manifold market
 * @returns Adapted market for Caribbean users
 */
export function adaptMarketForCaribbean(market: ManifoldMarket): AdaptedMarket | null {
  const question = market.question;
  const lowerQ = question.toLowerCase();

  // Global questions that work as-is (crypto, major events)
  const isGlobalQuestion = lowerQ.match(/bitcoin|btc|eth|crypto|price|usd|world/);

  let adaptedQuestion = question;
  let adaptedDescription = market.description || 'Based on trending Manifold Markets question.';
  let country = 'Jamaica'; // Default

  if (!isGlobalQuestion) {
    // Try to adapt to Caribbean context
    country = getRandomCaribCountry();

    // Adaptation patterns
    if (lowerQ.includes('will it rain')) {
      adaptedQuestion = question.replace(/San Francisco|New York|LA|Seattle/gi, 'Kingston');
      country = 'Jamaica';
    } else if (lowerQ.includes('election') || lowerQ.includes('president')) {
      // Skip US-specific elections unless we can adapt
      if (lowerQ.includes('biden') || lowerQ.includes('trump')) {
        return null; // Can't adapt US presidential elections
      }
      adaptedQuestion = question.replace(/US|USA|America/gi, country);
    } else if (lowerQ.includes('stock') || lowerQ.includes('market')) {
      // Adapt to Caribbean business context
      adaptedQuestion = question.replace(/S&P 500|Dow|NASDAQ/gi, `${country}'s stock market`);
    } else if (lowerQ.includes('team') || lowerQ.includes('win')) {
      // Can adapt some sports questions
      adaptedQuestion = question;
    } else {
      // For other questions, keep as global but assign to a country
      adaptedQuestion = question;
      country = getRandomCaribCountry();
    }
  }

  // Format close date
  const closeDate = new Date(market.closeTime);
  const closeDateStr = closeDate.toISOString().split('T')[0];

  // Categorize
  const category = categorizeMarket(question);

  return {
    question: adaptedQuestion,
    description: adaptedDescription.slice(0, 500), // Limit description length
    category,
    country,
    close_date: closeDateStr,
    options: ['Yes', 'No'],
    resolution_criteria: `Resolved using the same criteria as Manifold Markets #${market.id}. See ${market.url} for details.`,
    liquidity_parameter: 100,
    source: `manifold:${market.id}`,
  };
}

/**
 * Fetch and adapt trending markets for Caribbean context
 * @param limit - Number of markets to fetch
 * @returns Array of adapted markets
 */
export async function fetchAndAdaptMarkets(limit: number = 100): Promise<AdaptedMarket[]> {
  console.log(`Fetching ${limit} trending markets from Manifold...`);

  const allMarkets = await fetchTrendingMarkets(limit);
  console.log(`Fetched ${allMarkets.length} markets from Manifold`);

  // Filter to short-term markets only
  const shortTermMarkets = filterShortTermMarkets(allMarkets);
  console.log(`Filtered to ${shortTermMarkets.length} short-term markets (closing within 7 days)`);

  // Adapt markets
  const adaptedMarkets: AdaptedMarket[] = [];
  for (const market of shortTermMarkets) {
    const adapted = adaptMarketForCaribbean(market);
    if (adapted) {
      adaptedMarkets.push(adapted);
    }
  }

  console.log(`Successfully adapted ${adaptedMarkets.length} markets for Caribbean context`);
  return adaptedMarkets;
}

/**
 * Add delay between operations
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
