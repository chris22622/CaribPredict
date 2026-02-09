# CaribPredict - Caribbean Prediction Markets

A Progressive Web App (PWA) for trading predictions on Caribbean events, built with Next.js 14 and Supabase.

## Features

- **Prediction Markets**: Trade on outcomes of Caribbean events
- **LMSR Automated Market Maker**: Fair, dynamic pricing based on market activity
- **15 CARICOM Nations**: Filter markets by country
- **Internal Wallet System**: Trade using satoshis (Bitcoin's smallest unit)
- **Real-time Updates**: Live odds and market data
- **Mobile-First Design**: Caribbean-themed, responsive UI
- **PWA Support**: Install to home screen, works offline

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: TailwindCSS with Caribbean color scheme
- **Database**: Supabase (PostgreSQL)
- **AMM Algorithm**: Logarithmic Market Scoring Rule (LMSR)
- **Icons**: Lucide React
- **PWA**: next-pwa

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account with database already set up

### Installation

1. Clone the repository:
```bash
cd "D:\Bot Projects\CaribPredict"
```

2. Install dependencies:
```bash
npm install
```

3. Environment variables are already set up in `.env.local`

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
CaribPredict/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   │   ├── markets/          # Market CRUD endpoints
│   │   └── trade/            # Trading endpoint
│   ├── market/[id]/          # Individual market page
│   ├── profile/              # User profile page
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Home page (market list)
│   └── globals.css           # Global styles
├── components/               # React components
│   ├── BalanceDisplay.tsx    # User balance widget
│   ├── CountryFilter.tsx     # Country selector
│   ├── MarketCard.tsx        # Market list item
│   └── TradingInterface.tsx  # Buy/sell shares UI
├── lib/                      # Core logic
│   ├── amm.ts               # LMSR pricing algorithm
│   ├── supabase.ts          # Supabase client
│   └── types.ts             # TypeScript types
├── public/                   # Static assets
│   ├── icons/               # PWA icons (placeholder)
│   └── manifest.json        # PWA manifest
└── package.json
```

## Database Schema

The following tables are already created in Supabase:

- **users**: User accounts with satoshi balances
- **markets**: Prediction market definitions
- **market_options**: Possible outcomes for each market
- **positions**: User holdings in markets
- **trades**: Trade history
- **transactions**: Financial transaction log
- **question_queue**: Upcoming market questions

## Usage

### For Users

1. **Browse Markets**: View all active prediction markets on the home page
2. **Filter by Country**: Select a CARICOM nation to see relevant markets
3. **Trade**: Click a market to view details and buy/sell shares
4. **Check Profile**: View your balance, positions, and trade history

### Creating Markets (API)

POST to `/api/markets`:
```json
{
  "question": "Will Jamaica win gold in track and field at 2026 Commonwealth Games?",
  "description": "Optional details",
  "country": "Jamaica",
  "category": "Sports",
  "close_date": "2026-07-25T00:00:00Z",
  "options": ["Yes", "No"],
  "liquidity_parameter": 100
}
```

### Trading (Internal API)

The `/api/trade` endpoint handles all buy/sell operations with:
- Balance checks
- Share validation
- Price slippage protection (1%)
- Atomic updates to prevent race conditions

## LMSR Pricing

CaribPredict uses the Logarithmic Market Scoring Rule (LMSR) for automated market making:

- **Cost Function**: `C(q) = b * ln(sum(e^(q_i/b)))`
- **Probability**: `P(i) = e^(q_i/b) / sum(e^(q_j/b))`
- **Liquidity Parameter (b)**: Controls price sensitivity (default: 100)

The AMM automatically adjusts odds based on trading activity, ensuring:
- Probabilities always sum to 1
- More liquidity = less price movement per trade
- Fair pricing for all market participants

## Deployment

### Build for Production

```bash
npm run build
npm start
```

### PWA Features

The app is installable on mobile devices:
- Tap "Add to Home Screen" in your browser
- Works offline with service worker caching
- Full-screen app experience

### Environment Variables

Required in production:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key

## Roadmap

- [ ] User authentication (Telegram, wallet connect)
- [ ] Bitcoin Lightning Network payouts
- [ ] Market resolution system
- [ ] Social features (comments, sharing)
- [ ] Push notifications for market events
- [ ] Chart visualizations
- [ ] Market maker incentives
- [ ] Multi-language support

## CARICOM Countries Supported

1. Antigua and Barbuda
2. Bahamas
3. Barbados
4. Belize
5. Dominica
6. Grenada
7. Guyana
8. Haiti
9. Jamaica
10. Montserrat
11. Saint Kitts and Nevis
12. Saint Lucia
13. Saint Vincent and the Grenadines
14. Suriname
15. Trinidad and Tobago

## License

MIT License - Build cool prediction markets!

## Support

For issues or questions, please open an issue on GitHub or contact the development team.

---

Built with ❤️ for the Caribbean
