// AI-generated images for market cards via Pollinations.ai
// Free, no API key needed — generates unique images from text prompts via URL
// Images are cached by Pollinations CDN so the same URL returns the same image

// Style hints per category to guide the AI image generation
const CATEGORY_STYLES: Record<string, string> = {
  Politics: 'Caribbean government building, tropical parliament, official and professional, warm island lighting',
  Sports: 'Caribbean sports action, athletic competition, vibrant tropical stadium, energetic',
  Economics: 'Caribbean economy, tropical port trade, island business district, golden hour',
  Entertainment: 'Caribbean carnival, island festival, reggae soca music, colorful and vibrant celebration',
  Technology: 'futuristic Caribbean tech, digital innovation, tropical modern city, neon accents',
  Culture: 'Caribbean culture, island traditions, tropical art and heritage, warm and authentic',
  Crypto: 'bitcoin cryptocurrency, digital currency futuristic, blockchain visualization, orange and gold',
  Weather: 'dramatic Caribbean weather, tropical ocean sky, island climate, atmospheric and moody',
};

// Extract meaningful keywords from the question for the image prompt
function extractKeywords(question: string): string {
  const stopWords = new Set([
    'will', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'is', 'be',
    'by', 'and', 'or', 'its', 'it', 'has', 'have', 'had', 'do', 'does', 'did',
    'this', 'that', 'these', 'those', 'than', 'more', 'most', 'before', 'after',
    'during', 'from', 'with', 'about', 'between', 'through', 'into', 'over',
    'under', 'what', 'which', 'who', 'when', 'where', 'how', 'any', 'each',
    'every', 'both', 'few', 'many', 'much', 'some', 'such', 'no', 'not', 'only',
    'own', 'other', 'so', 'too', 'very', 'can', 'could', 'would', 'should',
    'may', 'might', 'shall', 'must', 'yes', 'no', 'end', 'above', 'below',
    'below', 'exceed', 'reach', 'within', 'next', 'first', 'last', 'new', 'old',
    'before', 'after', 'percent', 'rate', 'level', 'number', 'total',
  ]);

  const words = question
    .replace(/[?!.,;:'"()%$#@0-9]/g, '')
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  return words.slice(0, 5).join(' ');
}

// Generate a deterministic seed from market ID for consistent images
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getMarketImageUrl(
  marketId: string,
  category: string,
  country: string,
  question: string,
  width: number = 600,
  height: number = 400,
): string {
  const keywords = extractKeywords(question);
  const style = CATEGORY_STYLES[category] || 'Caribbean tropical scene, vibrant';
  const countryContext = country !== 'All CARICOM' ? country : 'Caribbean';

  // Build a descriptive prompt for the AI image
  const prompt = `${keywords}, ${countryContext}, ${style}, cinematic photography, wide angle, no text, no words, no letters, no watermark`;

  // Use the market ID as a seed so each market always gets the same image
  const seed = hashCode(marketId);

  // Pollinations.ai generates AI images from URL — free, no API key
  const encodedPrompt = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true`;
}

// Fallback gradient backgrounds based on category (for when images fail to load)
export const CATEGORY_GRADIENTS: Record<string, string> = {
  Politics: 'from-blue-600 to-indigo-800',
  Sports: 'from-green-500 to-emerald-700',
  Economics: 'from-amber-500 to-yellow-700',
  Entertainment: 'from-purple-500 to-violet-700',
  Technology: 'from-cyan-500 to-blue-700',
  Culture: 'from-pink-500 to-rose-700',
  Crypto: 'from-orange-500 to-amber-700',
  Weather: 'from-sky-400 to-blue-600',
};

// Category icons for overlay fallback
export const CATEGORY_ICONS: Record<string, string> = {
  Politics: '\u{1F3DB}',
  Sports: '\u{26BD}',
  Economics: '\u{1F4C8}',
  Entertainment: '\u{1F3B6}',
  Technology: '\u{1F4BB}',
  Culture: '\u{1F3AD}',
  Crypto: '\u{20BF}',
  Weather: '\u{1F30A}',
};
