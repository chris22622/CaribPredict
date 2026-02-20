// Generate relevant images for market cards
// Uses curated Unsplash photo IDs for reliable, fast loading images

// Curated photo IDs from Unsplash organized by category
// Each image is free to use under Unsplash license
const CATEGORY_PHOTOS: Record<string, string[]> = {
  Politics: [
    'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=600&h=400&fit=crop', // parliament
    'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=600&h=400&fit=crop', // voting
    'https://images.unsplash.com/photo-1575320181282-9afab399332c?w=600&h=400&fit=crop', // flags
    'https://images.unsplash.com/photo-1606761568499-6d2451b23c66?w=600&h=400&fit=crop', // government
    'https://images.unsplash.com/photo-1523995462485-3d171b5c8fa9?w=600&h=400&fit=crop', // debate
    'https://images.unsplash.com/photo-1555848962-6e79363ec58f?w=600&h=400&fit=crop', // capitol
  ],
  Sports: [
    'https://images.unsplash.com/photo-1461896836934-bd45ba7e3e7a?w=600&h=400&fit=crop', // cricket
    'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=600&h=400&fit=crop', // soccer
    'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600&h=400&fit=crop', // athletics
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&h=400&fit=crop', // stadium
    'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600&h=400&fit=crop', // running
    'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600&h=400&fit=crop', // swimming
  ],
  Economics: [
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=400&fit=crop', // trading
    'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&h=400&fit=crop', // shipping
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=400&fit=crop', // business
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&h=400&fit=crop', // buildings
    'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&h=400&fit=crop', // money
    'https://images.unsplash.com/photo-1444653614773-995cb1ef9efa?w=600&h=400&fit=crop', // market
  ],
  Entertainment: [
    'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=400&fit=crop', // carnival
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=400&fit=crop', // music
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=400&fit=crop', // concert
    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&h=400&fit=crop', // festival
    'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&h=400&fit=crop', // dance
    'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=600&h=400&fit=crop', // stage
  ],
  Technology: [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop', // circuit
    'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=600&h=400&fit=crop', // laptop
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&h=400&fit=crop', // matrix
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&h=400&fit=crop', // cyber
    'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=600&h=400&fit=crop', // tech
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&h=400&fit=crop', // team
  ],
  Culture: [
    'https://images.unsplash.com/photo-1504214208698-ea1916a2195a?w=600&h=400&fit=crop', // tropical
    'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=600&h=400&fit=crop', // art
    'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=600&h=400&fit=crop', // people
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=400&fit=crop', // portrait
    'https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=600&h=400&fit=crop', // food
    'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=600&h=400&fit=crop', // beach
  ],
  Crypto: [
    'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=600&h=400&fit=crop', // bitcoin
    'https://images.unsplash.com/photo-1639762681057-408e52192e55?w=600&h=400&fit=crop', // ethereum
    'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=600&h=400&fit=crop', // crypto
    'https://images.unsplash.com/photo-1605792657660-596af9009e82?w=600&h=400&fit=crop', // chart
    'https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=600&h=400&fit=crop', // bitcoin coin
    'https://images.unsplash.com/photo-1516245834210-c4c142787335?w=600&h=400&fit=crop', // blockchain
  ],
  Weather: [
    'https://images.unsplash.com/photo-1527482797697-8795b05a13fe?w=600&h=400&fit=crop', // storm
    'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=600&h=400&fit=crop', // clouds
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop', // beach
    'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600&h=400&fit=crop', // tropical
    'https://images.unsplash.com/photo-1504386106331-3e4e71712b38?w=600&h=400&fit=crop', // sun
    'https://images.unsplash.com/photo-1498766246071-47e5f1e9413a?w=600&h=400&fit=crop', // rain
  ],
};

// Default/fallback photos
const DEFAULT_PHOTOS = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop', // beach
  'https://images.unsplash.com/photo-1504214208698-ea1916a2195a?w=600&h=400&fit=crop', // tropical
  'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=600&h=400&fit=crop', // caribbean
  'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=600&h=400&fit=crop', // ocean
];

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
  _country: string,
  _question: string,
  _width: number = 600,
  _height: number = 400,
): string {
  const photos = CATEGORY_PHOTOS[category] || DEFAULT_PHOTOS;
  const seed = hashCode(marketId);
  return photos[seed % photos.length];
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
