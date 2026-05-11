import { Market, MarketOption } from './types';

export const BTC_USD = 65000;
export const satsToUsd = (sats: number) => (sats / 1e8) * BTC_USD;
export const usdToSats = (usd: number) => Math.round((usd / BTC_USD) * 1e8);

export interface CpCountry { code: string; name: string; flag: string; dbName: string; }
export interface CpCategory { id: string; name: string; glyph: string; dbName?: string; }

export const COUNTRIES: CpCountry[] = [
  { code: 'JM', name: 'Jamaica',            flag: '🇯🇲', dbName: 'Jamaica' },
  { code: 'TT', name: 'Trinidad & Tobago',  flag: '🇹🇹', dbName: 'Trinidad and Tobago' },
  { code: 'BB', name: 'Barbados',           flag: '🇧🇧', dbName: 'Barbados' },
  { code: 'GY', name: 'Guyana',             flag: '🇬🇾', dbName: 'Guyana' },
  { code: 'BS', name: 'Bahamas',            flag: '🇧🇸', dbName: 'Bahamas' },
  { code: 'DM', name: 'Dominica',           flag: '🇩🇲', dbName: 'Dominica' },
  { code: 'GD', name: 'Grenada',            flag: '🇬🇩', dbName: 'Grenada' },
  { code: 'LC', name: 'Saint Lucia',        flag: '🇱🇨', dbName: 'Saint Lucia' },
  { code: 'VC', name: 'St Vincent',         flag: '🇻🇨', dbName: 'Saint Vincent and the Grenadines' },
  { code: 'AG', name: 'Antigua',            flag: '🇦🇬', dbName: 'Antigua and Barbuda' },
  { code: 'KN', name: 'St Kitts & Nevis',   flag: '🇰🇳', dbName: 'Saint Kitts and Nevis' },
  { code: 'SR', name: 'Suriname',           flag: '🇸🇷', dbName: 'Suriname' },
  { code: 'BZ', name: 'Belize',             flag: '🇧🇿', dbName: 'Belize' },
  { code: 'HT', name: 'Haiti',              flag: '🇭🇹', dbName: 'Haiti' },
  { code: 'MS', name: 'Montserrat',         flag: '🇲🇸', dbName: 'Montserrat' },
];

export const CATEGORIES: CpCategory[] = [
  { id: 'trending',     name: 'Trending',     glyph: 'flame' },
  { id: 'new',          name: 'New',          glyph: 'sparkle' },
  { id: 'politics',     name: 'Politics',     glyph: 'gavel',   dbName: 'Politics' },
  { id: 'sports',       name: 'Sports',       glyph: 'sport',   dbName: 'Sports' },
  { id: 'economics',    name: 'Economics',    glyph: 'chart',   dbName: 'Economics' },
  { id: 'entertainment',name: 'Entertainment',glyph: 'mic',     dbName: 'Entertainment' },
  { id: 'culture',      name: 'Culture',      glyph: 'mask',    dbName: 'Culture' },
  { id: 'technology',   name: 'Technology',   glyph: 'sparkle', dbName: 'Technology' },
  { id: 'weather',      name: 'Hurricane',    glyph: 'storm' },
  { id: 'carnival',     name: 'Carnival',     glyph: 'feather' },
];

export function getCountry(code: string): CpCountry | undefined {
  return COUNTRIES.find(c => c.code === code);
}
export function getCountryByDb(dbName: string): CpCountry | undefined {
  return COUNTRIES.find(c => c.dbName === dbName);
}
export function getCategory(id: string): CpCategory | undefined {
  return CATEGORIES.find(c => c.id === id);
}
export function categoryIdFromDb(dbName: string | undefined): string {
  if (!dbName) return 'trending';
  const lower = dbName.toLowerCase();
  const m = CATEGORIES.find(c => c.dbName?.toLowerCase() === lower || c.id === lower);
  return m?.id || 'trending';
}

export function fmtUsd(n: number, opts: { signed?: boolean } = {}): string {
  const sign = n > 0 ? '+' : (n < 0 ? '−' : '');
  const abs = Math.abs(n);
  const s = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (opts.signed ? sign : '') + '$' + s;
}
export function fmtCompactUsd(n: number): string {
  if (n >= 1e9) return '$' + (n/1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n/1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + (n/1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(0);
}
export function fmtSats(n: number): string { return Math.round(n).toLocaleString('en-US') + ' sats'; }
export function fmtPct(p: number): string { return Math.round(p * 100) + '%'; }
export function fmtCents(p: number): string { return Math.round(p * 100) + '¢'; }
export function fmtCloseDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export interface CpOutcome {
  id: string;
  label: string;
  prob: number;
  yes: number;
  no: number;
  total_shares: number;
}
export interface CpThumb {
  kind: 'flag' | 'storm' | 'sport' | 'pattern';
  code?: string;
  tone?: string;
  label?: string;
}
export interface CpMarket {
  id: string;
  question: string;
  description?: string;
  category: string;
  categoryDb: string;
  countries: string[];
  countryDb: string;
  closes: string;
  closeDate: string;
  resolved: boolean;
  liquidityParameter: number;
  volumeUsd: number;
  commentCount: number;
  thumb: CpThumb;
  outcomes: CpOutcome[];
  rules: string;
  raw: Market;
}

export function pickThumb(catId: string, countryDb: string): CpThumb {
  const country = getCountryByDb(countryDb);
  if (catId === 'weather') return { kind: 'storm' };
  if (catId === 'sports') return { kind: 'sport', label: 'Match' };
  if (catId === 'carnival') return { kind: 'pattern', tone: 'carnival' };
  if (catId === 'entertainment') return { kind: 'pattern', tone: 'soca' };
  if (catId === 'economics') return { kind: 'pattern', tone: 'currency' };
  if (catId === 'culture') return { kind: 'pattern', tone: 'reggae' };
  if (country) return { kind: 'flag', code: country.code };
  return { kind: 'pattern', tone: 'default' };
}

export function toCpMarket(m: Market, options: MarketOption[]): CpMarket {
  const catId = categoryIdFromDb(m.category);
  const country = getCountryByDb(m.country_filter);
  const outcomes: CpOutcome[] = options.map(o => {
    const prob = o.probability;
    return {
      id: o.id,
      label: o.label,
      prob,
      yes: Math.round(prob * 100),
      no: Math.round((1 - prob) * 100),
      total_shares: o.total_shares,
    };
  });
  return {
    id: m.id,
    question: m.question,
    description: m.description,
    category: catId,
    categoryDb: m.category,
    countries: country ? [country.code] : [],
    countryDb: m.country_filter,
    closes: fmtCloseDate(m.close_date),
    closeDate: m.close_date,
    resolved: m.resolved,
    liquidityParameter: m.liquidity_parameter,
    volumeUsd: 0,
    commentCount: 0,
    thumb: pickThumb(catId, m.country_filter),
    outcomes,
    rules: m.description || 'This market resolves based on official sources at the close date.',
    raw: m,
  };
}

export function genSyntheticHistory(seed: number, endProb: number, hours = 240) {
  const rand = mulberry32(seed);
  const pts: { t: number; p: number }[] = [];
  let p = clamp(endProb + (rand() - 0.5) * 0.5, 0.05, 0.95);
  for (let i = 0; i < hours; i++) {
    const drift = (endProb - p) * 0.012;
    const noise = (rand() - 0.5) * 0.035;
    p = clamp(p + drift + noise, 0.02, 0.98);
    pts.push({ t: i, p });
  }
  pts[pts.length - 1].p = endProb;
  return { points: pts, events: [] as { i: number; label: string }[] };
}
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function clamp(x: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, x)); }

export function seedFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}
