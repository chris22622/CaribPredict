/**
 * Claude AI Integration for Question Generation
 * Uses Claude API to generate prediction market questions from news articles
 */

import Anthropic from '@anthropic-ai/sdk';
import { NewsArticle } from './brave-search';

export interface GeneratedQuestion {
  question: string;
  description: string;
  category: string;
  country: string;
  close_date: string;
  options: string[];
  resolution_criteria: string;
  liquidity_parameter: number;
}

/**
 * Get a date string N days from now in YYYY-MM-DD format
 */
function getDateInDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Validate that a close_date is within 1-7 days from now
 */
function isValidShortTermDate(dateString: string): boolean {
  const closeDate = new Date(dateString);
  const today = new Date();
  const diffTime = closeDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 1 && diffDays <= 7;
}

/**
 * Generate prediction market questions from news articles using Claude
 * @param country - The Caribbean country
 * @param articles - Array of news articles
 * @returns Array of generated questions
 */
export async function generateQuestions(
  country: string,
  articles: NewsArticle[]
): Promise<GeneratedQuestion[]> {
  const apiKey = process.env.CLAUDE_API_KEY;

  if (!apiKey) {
    throw new Error('CLAUDE_API_KEY environment variable is not set');
  }

  if (articles.length === 0) {
    console.log(`No articles provided for ${country}, skipping question generation`);
    return [];
  }

  const anthropic = new Anthropic({
    apiKey: apiKey,
  });

  // Format articles for the prompt
  const articlesText = articles
    .slice(0, 10) // Use top 10 articles
    .map((article, index) => {
      return `
Article ${index + 1}:
Title: ${article.title}
Description: ${article.description}
URL: ${article.url}
${article.age ? `Age: ${article.age}` : ''}
`;
    })
    .join('\n---\n');

  const prompt = `You are a prediction market question generator for CaribPredict, a Caribbean-focused prediction market platform similar to Polymarket.

Based on these recent news articles from ${country}:

${articlesText}

Generate 5-8 EXCITING, BUZZY prediction market questions that:

1. ⚡ MUST resolve within 1-7 DAYS ONLY (this is critical - NO long-term questions!)
2. 🔥 Focus on IMMEDIATE events happening THIS WEEK or NEXT FEW DAYS
3. Are binary (Yes/No) or multiple choice (3-5 options)
4. Have clear, verifiable resolution criteria
5. Are EXCITING topics people want to bet on (sports matches, weather, crypto prices, viral moments)
6. Use specific days: "by Friday", "this Saturday", "tomorrow", "by end of week"
7. Must be resolvable with publicly available information
8. Avoid sensitive topics (violence, disasters, personal attacks, death, medical conditions)

QUESTION INSPIRATION (adapt to Caribbean context):
- Sports: "Will Trinidad & Tobago's cricket team win their match this Saturday?"
- Weather: "Will Kingston get more than 2 inches of rain by Friday?"
- Crypto: "Will Bitcoin close above $95k this Sunday?"
- Politics: "Will Jamaica's PM make a statement about the new policy this week?"
- Pop Culture: "Will [Caribbean artist]'s new song hit 1M views by end of week?"
- Breaking News: "Will the hurricane warning be upgraded by Thursday?"
- Business: "Will [Caribbean company] stock rise 5% by Friday close?"
- Social: "Will [trending topic] remain trending in ${country} tomorrow?"

IMPORTANT: Output ONLY valid JSON in the exact format below. Do not include any text before or after the JSON.

Output format:
{
  "questions": [
    {
      "question": "Will Jamaica's national football team win against Haiti this Saturday?",
      "description": "Jamaica faces Haiti in a crucial CONCACAF match this Saturday at 7 PM. Recent form shows Jamaica won 2 of last 3 matches...",
      "category": "Sports",
      "country": "${country}",
      "close_date": "${getDateInDays(3)}",
      "options": ["Yes", "No"],
      "resolution_criteria": "Resolved based on official match result published by CONCACAF immediately after the final whistle. 'Yes' if Jamaica wins, 'No' if draw or loss.",
      "liquidity_parameter": 100
    }
  ]
}

Categories to choose from: Sports, Politics, Economics, Technology, Entertainment, Culture, Crypto, Weather, Breaking News, Business, Social, Pop Culture

Remember:
- close_date must be in YYYY-MM-DD format
- close_date MUST be 1-7 days from today (${new Date().toISOString().split('T')[0]})
- liquidity_parameter is always 100
- resolution_criteria must be specific and verifiable
- Make questions BUZZY and EXCITING like Polymarket
- Focus on IMMEDIATE events only
- Output ONLY the JSON, no other text`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract the response text
    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : '';

    // Parse JSON response
    let parsedResponse: { questions: GeneratedQuestion[] };
    try {
      // Try to extract JSON if Claude added any extra text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        parsedResponse = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.error('Failed to parse Claude response:', responseText);
      throw new Error(`Invalid JSON response from Claude: ${parseError}`);
    }

    // Validate and return questions
    if (!parsedResponse.questions || !Array.isArray(parsedResponse.questions)) {
      throw new Error('Invalid response format: missing questions array');
    }

    // Validate each question has required fields AND is short-term (1-7 days)
    const validQuestions = parsedResponse.questions.filter(q => {
      const hasRequiredFields = (
        q.question &&
        q.description &&
        q.category &&
        q.country &&
        q.close_date &&
        q.options &&
        Array.isArray(q.options) &&
        q.options.length >= 2 &&
        q.resolution_criteria &&
        typeof q.liquidity_parameter === 'number'
      );

      if (!hasRequiredFields) {
        console.log(`Question rejected (missing fields): ${q.question}`);
        return false;
      }

      // CRITICAL: Enforce 1-7 day resolution window
      if (!isValidShortTermDate(q.close_date)) {
        console.log(`Question rejected (date not 1-7 days): ${q.question} (close_date: ${q.close_date})`);
        return false;
      }

      return true;
    });

    console.log(`Generated ${validQuestions.length} valid questions for ${country}`);
    return validQuestions;
  } catch (error) {
    console.error(`Error generating questions for ${country}:`, error);
    throw error;
  }
}

/**
 * Generate questions for multiple countries
 * @param newsMap - Map of country to news articles
 * @param delayMs - Delay between API calls
 * @returns Map of country to generated questions
 */
export async function generateQuestionsForMultipleCountries(
  newsMap: Map<string, NewsArticle[]>,
  delayMs: number = 2000
): Promise<Map<string, GeneratedQuestion[]>> {
  const results = new Map<string, GeneratedQuestion[]>();
  const countries = Array.from(newsMap.keys());

  for (const country of countries) {
    const articles = newsMap.get(country) || [];

    if (articles.length === 0) {
      console.log(`No articles for ${country}, skipping`);
      results.set(country, []);
      continue;
    }

    try {
      console.log(`Generating questions for ${country}...`);
      const questions = await generateQuestions(country, articles);
      results.set(country, questions);
      console.log(`Generated ${questions.length} questions for ${country}`);

      // Add delay to avoid rate limiting
      if (countries.indexOf(country) < countries.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`Failed to generate questions for ${country}:`, error);
      results.set(country, []); // Set empty array on error
    }
  }

  return results;
}
