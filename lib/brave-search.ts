/**
 * Brave Search API Integration
 * Fetches recent news articles for Caribbean countries
 */

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  age?: string;
  thumbnail?: {
    src: string;
  };
}

export interface BraveSearchResponse {
  query: string;
  web?: {
    results: Array<{
      title: string;
      description: string;
      url: string;
      age?: string;
      thumbnail?: {
        src: string;
      };
    }>;
  };
}

/**
 * Search for Caribbean news articles using Brave Search API
 * @param country - The Caribbean country to search for
 * @param daysBack - Number of days to look back (default: 7)
 * @returns Array of news articles
 */
export async function searchCaribbeanNews(
  country: string,
  daysBack: number = 7
): Promise<NewsArticle[]> {
  const apiKey = process.env.BRAVE_API_KEY;

  if (!apiKey) {
    throw new Error('BRAVE_API_KEY environment variable is not set');
  }

  // Construct search query
  const query = `${country} news`;

  // Determine freshness parameter based on daysBack
  let freshness = 'pw'; // past week (default)
  if (daysBack <= 1) freshness = 'pd'; // past day
  else if (daysBack <= 7) freshness = 'pw'; // past week
  else if (daysBack <= 30) freshness = 'pm'; // past month

  try {
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&freshness=${freshness}&count=10`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Brave Search API error: ${response.status} - ${errorText}`);
    }

    const data: BraveSearchResponse = await response.json();

    // Extract and filter news articles
    const articles: NewsArticle[] = data.web?.results?.map(result => ({
      title: result.title,
      description: result.description,
      url: result.url,
      age: result.age,
      thumbnail: result.thumbnail,
    })) || [];

    // Filter for relevant news sources (optional)
    const filteredArticles = articles.filter(article => {
      // Basic filtering: exclude irrelevant domains if needed
      const url = article.url.toLowerCase();
      // Add any domain filtering logic here if needed
      return true;
    });

    return filteredArticles.slice(0, 10); // Return top 10 results
  } catch (error) {
    console.error(`Error fetching news for ${country}:`, error);
    throw error;
  }
}

/**
 * Add delay between API calls to respect rate limits
 * @param ms - Milliseconds to wait
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Search news for multiple countries with rate limiting
 * @param countries - Array of country names
 * @param daysBack - Number of days to look back
 * @param delayMs - Delay between requests in milliseconds
 * @returns Map of country to news articles
 */
export async function searchMultipleCountries(
  countries: string[],
  daysBack: number = 7,
  delayMs: number = 1500
): Promise<Map<string, NewsArticle[]>> {
  const results = new Map<string, NewsArticle[]>();

  for (const country of countries) {
    try {
      console.log(`Searching news for ${country}...`);
      const articles = await searchCaribbeanNews(country, daysBack);
      results.set(country, articles);
      console.log(`Found ${articles.length} articles for ${country}`);

      // Add delay to respect rate limits
      if (countries.indexOf(country) < countries.length - 1) {
        await delay(delayMs);
      }
    } catch (error) {
      console.error(`Failed to fetch news for ${country}:`, error);
      results.set(country, []); // Set empty array on error
    }
  }

  return results;
}
