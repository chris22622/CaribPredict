# CaribPredict - Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Install Dependencies
```bash
cd "D:\Bot Projects\CaribPredict"
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### 3. Seed Sample Markets (Optional)
```bash
npm install -g tsx
npx tsx scripts/seed-markets.ts
```

This creates 5 sample prediction markets for testing.

## ✅ What's Already Set Up

- ✅ Next.js 14 with App Router
- ✅ TypeScript configuration
- ✅ TailwindCSS with Caribbean theme
- ✅ Supabase client (credentials in .env.local)
- ✅ LMSR AMM pricing engine
- ✅ PWA support (manifest.json)
- ✅ All database tables deployed

## 📱 Key Pages

1. **Home (/)** - Browse all prediction markets
   - Filter by CARICOM country
   - View current odds
   - Quick access to trading

2. **Market (/market/[id])** - Individual market trading
   - Buy/sell shares
   - See your positions
   - Real-time odds updates

3. **Profile (/profile)** - Your account
   - Balance in satoshis
   - Active positions with P&L
   - Trade history

## 🎯 How to Test Trading

1. The app creates a demo user automatically with 10,000 sats
2. Navigate to any market
3. Select an option (Yes/No or multiple choice)
4. Enter number of shares
5. Click Buy or Sell
6. Watch the odds update in real-time

## 🔧 Available Scripts

```bash
npm run dev      # Start development server (port 3000)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 🌐 Environment Variables

Already configured in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anonymous key for client access
- `SUPABASE_SERVICE_ROLE_KEY` - Admin key (for seeding only)

## 🎨 Customization

### Colors (tailwind.config.ts)
```typescript
caribbean: {
  blue: '#0077BE',    // Primary actions
  teal: '#00B4D8',    // Accents, borders
  sand: '#F4E4C1',    // Info boxes
  coral: '#FF6B6B',   // Sell, warnings
  green: '#06D6A0',   // Buy, profits
  navy: '#023047',    // Text, headers
}
```

### Liquidity Parameter (lib/amm.ts)
- Default: 100
- Higher = less price movement per trade
- Lower = more volatile odds

## 📊 Sample Market Structure

```json
{
  "question": "Will Jamaica win gold at 2026 Commonwealth Games?",
  "country": "Jamaica",
  "category": "Sports",
  "close_date": "2026-07-24T00:00:00Z",
  "options": ["Yes", "No"],
  "liquidity_parameter": 100
}
```

## 🐛 Common Issues

**Markets not showing?**
- Run the seed script to create sample markets
- Check Supabase credentials in .env.local
- Verify database tables exist

**Build warnings about themeColor?**
- Fixed! Using viewport export in layout.tsx

**PWA not installing?**
- PWA disabled in development mode
- Build for production to test PWA features

**Trading fails?**
- Check user balance (should start with 10,000 sats)
- Verify market is "active" status
- Check browser console for errors

## 🔥 Next Steps

1. **Add Icons**: Generate PWA icons and place in `public/icons/`
2. **Create Markets**: Use `/api/markets` POST endpoint or seed script
3. **Test Trading**: Buy/sell shares and watch odds change
4. **Deploy**: Build and deploy to Vercel/Netlify
5. **Add Features**: Authentication, market resolution, Lightning payments

## 📚 Documentation

- [Full README](./README.md) - Detailed documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [TailwindCSS](https://tailwindcss.com/docs)

## 💡 Pro Tips

- Use Chrome DevTools Application tab to test PWA features
- Check Network tab to see API calls
- Monitor Supabase dashboard for database activity
- Test on mobile for best experience

---

**Ready to predict the future of the Caribbean? Let's go! 🌴**
