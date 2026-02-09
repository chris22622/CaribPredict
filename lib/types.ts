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
  country: string;
  category: string;
  close_date: string;
  resolve_date?: string;
  status: 'active' | 'closed' | 'resolved';
  total_volume: number;
  liquidity_parameter: number;
  created_at: string;
  resolved_outcome?: number;
}

export interface MarketOption {
  id: string;
  market_id: string;
  option_text: string;
  option_index: number;
  current_shares: number;
  current_probability: number;
}

export interface Position {
  id: string;
  user_id: string;
  market_id: string;
  option_index: number;
  shares: number;
  average_price: number;
  created_at: string;
  updated_at: string;
}

export interface Trade {
  id: string;
  user_id: string;
  market_id: string;
  option_index: number;
  trade_type: 'buy' | 'sell';
  shares: number;
  price: number;
  cost_satoshis: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  transaction_type: 'deposit' | 'withdrawal' | 'trade' | 'payout';
  amount_satoshis: number;
  reference_id?: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
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
