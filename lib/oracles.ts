// External data sources used by auto-settlement.
//
// CoinGecko: free public API for crypto prices. No key required for low-rate
// usage. https://www.coingecko.com/en/api/documentation
//
// API-Football: free tier from api-football.com, x-rapidapi-key header.
// https://www.api-football.com/

const COINGECKO_BASE = process.env.COINGECKO_HOST || 'https://api.coingecko.com/api/v3';
const APIFOOTBALL_BASE = process.env.APIFOOTBALL_HOST || 'https://v3.football.api-sports.io';
const APIFOOTBALL_KEY = process.env.APIFOOTBALL_API_KEY || '';

export interface CoinGeckoConfig {
  coin_id: string;            // e.g. "bitcoin", "ethereum"
  vs_currency?: string;       // default "usd"
  threshold: number;          // numeric threshold to compare current price against
  comparator: 'above' | 'below' | 'at_or_above' | 'at_or_below';
  yes_option_id: string;      // option to credit when condition is true
  // when condition false, the OTHER option(s) are NO-side winners (handled by settle)
}

export interface ApiFootballConfig {
  fixture_id: number;
  outcome_field: 'home_win' | 'away_win' | 'draw' | 'over_2_5' | 'btts' | 'first_half_goals';
  yes_option_id: string;
  // see same NO-side handling note as CoinGecko
}

export interface OracleResolution {
  ok: boolean;
  /** The option id that resolved YES. NO-side bets on other options win. */
  winningOptionId?: string;
  winningSide?: 'YES' | 'NO';
  raw: any;
  reason: string;
}

/** Fetch the current USD price of a coin from CoinGecko. */
export async function coinGeckoPrice(coinId: string, vs: string = 'usd'): Promise<number> {
  const url = `${COINGECKO_BASE}/simple/price?ids=${encodeURIComponent(coinId)}&vs_currencies=${encodeURIComponent(vs)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
  const json: any = await res.json();
  const price = json?.[coinId]?.[vs];
  if (typeof price !== 'number') throw new Error(`CoinGecko: no price for ${coinId}/${vs}`);
  return price;
}

/** Resolve a CoinGecko-driven market by comparing current price to a threshold. */
export async function resolveCoinGecko(cfg: CoinGeckoConfig): Promise<OracleResolution> {
  const price = await coinGeckoPrice(cfg.coin_id, cfg.vs_currency || 'usd');
  const t = cfg.threshold;
  const conditionTrue =
    cfg.comparator === 'above'         ? price > t
    : cfg.comparator === 'at_or_above' ? price >= t
    : cfg.comparator === 'below'       ? price < t
    : cfg.comparator === 'at_or_below' ? price <= t
    : false;
  return {
    ok: true,
    winningOptionId: cfg.yes_option_id,
    winningSide: conditionTrue ? 'YES' : 'NO',
    raw: { price, threshold: t, comparator: cfg.comparator },
    reason: conditionTrue
      ? `${cfg.coin_id} @ ${price} ${cfg.comparator} ${t} -> YES`
      : `${cfg.coin_id} @ ${price} not ${cfg.comparator} ${t} -> NO`,
  };
}

/** Fetch a single fixture from API-Football. */
export async function apiFootballFixture(fixtureId: number): Promise<any> {
  if (!APIFOOTBALL_KEY) throw new Error('APIFOOTBALL_API_KEY env var is not set');
  const url = `${APIFOOTBALL_BASE}/fixtures?id=${fixtureId}`;
  const res = await fetch(url, {
    headers: {
      'x-rapidapi-key': APIFOOTBALL_KEY,
      'x-rapidapi-host': 'v3.football.api-sports.io',
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`API-Football HTTP ${res.status}`);
  const json: any = await res.json();
  return json?.response?.[0] || null;
}

/** Resolve an API-Football-driven market on a fixture's full-time result. */
export async function resolveApiFootball(cfg: ApiFootballConfig): Promise<OracleResolution> {
  const fx = await apiFootballFixture(cfg.fixture_id);
  if (!fx) return { ok: false, raw: null, reason: 'fixture not found' };
  const status = fx?.fixture?.status?.short;
  if (status !== 'FT' && status !== 'AET' && status !== 'PEN') {
    return { ok: false, raw: fx, reason: `fixture not final yet: ${status}` };
  }
  const homeGoals = fx?.goals?.home;
  const awayGoals = fx?.goals?.away;
  const firstHalfHome = fx?.score?.halftime?.home;
  const firstHalfAway = fx?.score?.halftime?.away;
  if (homeGoals == null || awayGoals == null) {
    return { ok: false, raw: fx, reason: 'goal totals missing' };
  }
  let conditionTrue = false;
  switch (cfg.outcome_field) {
    case 'home_win':       conditionTrue = homeGoals > awayGoals; break;
    case 'away_win':       conditionTrue = awayGoals > homeGoals; break;
    case 'draw':           conditionTrue = homeGoals === awayGoals; break;
    case 'over_2_5':       conditionTrue = (homeGoals + awayGoals) > 2.5; break;
    case 'btts':           conditionTrue = homeGoals > 0 && awayGoals > 0; break;
    case 'first_half_goals':
      conditionTrue = (firstHalfHome ?? 0) + (firstHalfAway ?? 0) > 0; break;
  }
  return {
    ok: true,
    winningOptionId: cfg.yes_option_id,
    winningSide: conditionTrue ? 'YES' : 'NO',
    raw: { homeGoals, awayGoals, firstHalfHome, firstHalfAway, status },
    reason: `${cfg.outcome_field}: home ${homeGoals}-${awayGoals} away (1H ${firstHalfHome ?? 0}-${firstHalfAway ?? 0}) -> ${conditionTrue ? 'YES' : 'NO'}`,
  };
}
