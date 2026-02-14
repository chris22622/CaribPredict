-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table with internal credits/wallet system
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_id BIGINT UNIQUE,
  username TEXT,
  country TEXT, -- CARICOM nation filter
  balance_satoshis BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prediction markets
CREATE TABLE markets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  description TEXT,
  country_filter TEXT, -- jamaica, trinidad, all, etc.
  close_date TIMESTAMPTZ NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  resolution TEXT, -- winning option
  category TEXT, -- politics, sports, entertainment, etc.
  liquidity_parameter DECIMAL(10,4) DEFAULT 100.0000, -- b parameter for LMSR
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Market options (Yes/No or multiple choice)
CREATE TABLE market_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_id UUID REFERENCES markets(id) ON DELETE CASCADE,
  label TEXT NOT NULL, -- "Yes", "No", or specific option
  probability DECIMAL(5,4) DEFAULT 0.5000, -- 0.0000 to 1.0000
  total_shares BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User positions in markets
CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  market_id UUID REFERENCES markets(id) ON DELETE CASCADE,
  option_id UUID REFERENCES market_options(id) ON DELETE CASCADE,
  shares BIGINT NOT NULL,
  avg_price DECIMAL(10,8), -- average price paid per share
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, market_id, option_id)
);

-- All financial transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- deposit, withdrawal, trade, payout, admin_credit
  amount_satoshis BIGINT NOT NULL, -- positive or negative
  btcpay_invoice_id TEXT, -- for deposits/withdrawals (future)
  status TEXT DEFAULT 'pending', -- pending, confirmed, failed
  metadata JSONB, -- additional transaction data
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trade history
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_id UUID REFERENCES markets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  option_id UUID REFERENCES market_options(id) ON DELETE CASCADE,
  shares BIGINT NOT NULL,
  price DECIMAL(10,8), -- price per share at time of trade
  is_buy BOOLEAN, -- true = buy, false = sell
  total_cost BIGINT, -- total cost in satoshis
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-generated questions queue
CREATE TABLE question_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brave_search_query TEXT,
  country TEXT,
  raw_news JSONB, -- JSON of news articles
  claude_prompt TEXT,
  generated_questions JSONB,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_markets_country_filter ON markets(country_filter);
CREATE INDEX idx_markets_close_date ON markets(close_date);
CREATE INDEX idx_markets_resolved ON markets(resolved);
CREATE INDEX idx_positions_user_id ON positions(user_id);
CREATE INDEX idx_positions_market_id ON positions(market_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_trades_market_id ON trades(market_id);
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_question_queue_status ON question_queue(status);

-- Row Level Security policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Users can view their own positions
CREATE POLICY "Users can view own positions" ON positions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can view their own transactions
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Public read access to markets and options (anyone can view markets)
CREATE POLICY "Anyone can view markets" ON markets
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view market options" ON market_options
  FOR SELECT USING (true);

-- Public read access to trades (for transparency)
CREATE POLICY "Anyone can view trades" ON trades
  FOR SELECT USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_markets_updated_at BEFORE UPDATE ON markets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_question_queue_updated_at BEFORE UPDATE ON question_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
