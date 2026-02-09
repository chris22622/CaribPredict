export interface User {
  id: string;
  telegram_id?: string;
  username?: string;
  balance_satoshis: number;
  created_at: string;
}

export interface Market {
  id: string;
  question: string;
  description?: string;
  country_filter: string;
  category: string;
  close_date: string;
  resolved: boolean;
  resolution?: string;
  liquidity_parameter: number;
  created_at: string;
  updated_at: string;
}

export interface MarketOption {
  id: string;
  market_id: string;
  label: string;
  probability: number;
  total_shares: number;
  created_at: string;
}

export interface Position {
  id: string;
  user_id: string;
  market_id: string;
  option_id: string;
  shares: number;
  avg_price: number;
  created_at: string;
  updated_at: string;
}

export interface Trade {
  id: string;
  user_id: string;
  market_id: string;
  option_id: string;
  shares: number;
  price: number;
  is_buy: boolean;
  total_cost: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'deposit' | 'withdrawal' | 'trade' | 'payout' | 'admin_credit';
  amount_satoshis: number;
  btcpay_invoice_id?: string;
  status: 'pending' | 'confirmed' | 'failed';
  metadata?: any;
  created_at: string;
}

export interface QuestionQueue {
  id: string;
  brave_search_query?: string;
  country: string;
  raw_news?: any; // JSON of news articles
  claude_prompt?: string;
  generated_questions?: any; // JSON array of questions
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  age?: string;
  thumbnail?: {
    src: string;
  };
}

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

export const CARICOM_COUNTRIES = [
  'All CARICOM',
  'Jamaica',
  'Trinidad and Tobago',
  'Barbados',
  'Guyana',
  'Suriname',
  'Bahamas',
  'Belize',
  'Dominica',
  'Grenada',
  'Haiti',
  'Saint Lucia',
  'Saint Vincent and the Grenadines',
  'Antigua and Barbuda',
  'Saint Kitts and Nevis',
  'Montserrat',
] as const;

export type CaricomCountry = typeof CARICOM_COUNTRIES[number];

// CARICOM countries for news search (excluding "All CARICOM")
export const CARICOM_COUNTRIES_FOR_NEWS = CARICOM_COUNTRIES.filter(
  c => c !== 'All CARICOM'
);
