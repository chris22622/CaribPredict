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

  const prompt = `You are a prediction market question generator for CaribPredict, a Caribbean-focused prediction market platform.

Based on these recent news articles from ${country}:

${articlesText}

Generate 3-5 high-quality prediction market questions that:

1. Are binary (Yes/No) or multiple choice (3-5 options)
2. Have clear, verifiable resolution criteria
3. Are interesting and relevant to Caribbean users
4. Have a specific close date (30-180 days from now, based on the event timeline)
5. Avoid sensitive topics (violence, disasters, personal attacks, death, medical conditions)
6. Focus on positive topics: sports, politics (elections, policies), economics, technology, entertainment, culture
7. Must be resolvable with publicly available information
8. Should be answerable with certainty when the time comes

IMPORTANT: Output ONLY valid JSON in the exact format below. Do not include any text before or after the JSON.

Output format:
{
  "questions": [
    {
      "question": "Will Jamaica's inflation rate drop below 5% by June 2026?",
      "description": "Based on Bank of Jamaica forecasts and recent economic trends showing declining inflation...",
      "category": "Economics",
      "country": "${country}",
      "close_date": "2026-06-30",
      "options": ["Yes", "No"],
      "resolution_criteria": "Resolved based on official Bank of Jamaica CPI data published in July 2026. The question resolves to 'Yes' if the official inflation rate is below 5.0%, otherwise 'No'.",
      "liquidity_parameter": 100
    }
  ]
}

Categories to choose from: Politics, Sports, Economics, Technology, Entertainment, Culture, Education, Infrastructure

Remember:
- close_date must be in YYYY-MM-DD format
- close_date should be 30-180 days from today (${new Date().toISOString().split('T')[0]})
- liquidity_parameter is always 100
- resolution_criteria must be specific and verifiable
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

    // Validate each question has required fields
    const validQuestions = parsedResponse.questions.filter(q => {
      return (
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
