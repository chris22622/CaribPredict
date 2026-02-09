# CaribPredict - Deployment Guide

## 🚀 Production Deployment

### Prerequisites
- Vercel/Netlify account
- Custom domain (optional)
- Supabase project (already configured)
- Git repository

## Option 1: Deploy to Vercel (Recommended)

### Step 1: Push to GitHub
```bash
cd "D:\Bot Projects\CaribPredict"
git init
git add .
git commit -m "Initial commit - CaribPredict MVP"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### Step 2: Import to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Vercel auto-detects Next.js settings

### Step 3: Configure Environment Variables
Add these in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Step 4: Deploy
- Click "Deploy"
- Wait 2-3 minutes
- Your app will be live at `https://your-project.vercel.app`

## Option 2: Deploy to Netlify

### Step 1: Build Configuration
Create `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

### Step 2: Deploy
```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

## Option 3: Self-Hosted (VPS)

### Requirements
- Ubuntu 22.04 server
- Node.js 18+
- Nginx
- PM2 for process management

### Setup Steps
```bash
# On your server
git clone <your-repo>
cd caribpredict
npm install
npm run build

# Start with PM2
npm install -g pm2
pm2 start npm --name "caribpredict" -- start
pm2 save
pm2 startup
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name caribpredict.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Post-Deployment Checklist

### 1. Configure Custom Domain
- Point DNS A record to deployment IP
- Enable HTTPS (automatic on Vercel/Netlify)
- Update `manifest.json` with production URL

### 2. Set Up Analytics
```bash
npm install @vercel/analytics
```

Add to `app/layout.tsx`:
```typescript
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### 3. Seed Production Markets
```bash
# Update scripts/seed-markets.ts with production data
npx tsx scripts/seed-markets.ts
```

### 4. Configure Supabase RLS (Row Level Security)

Enable RLS on tables:
```sql
-- Users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Markets - public read, admin write
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active markets"
  ON markets FOR SELECT
  USING (status = 'active');

-- Similar policies for other tables
```

### 5. Enable Rate Limiting
Install middleware:
```bash
npm install @upstash/ratelimit @upstash/redis
```

Create `middleware.ts`:
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

export async function middleware(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous';
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return new Response('Too many requests', { status: 429 });
  }
}

export const config = {
  matcher: '/api/:path*',
};
```

### 6. Add Error Monitoring
```bash
npm install @sentry/nextjs
```

Initialize Sentry:
```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});
```

### 7. Generate PWA Icons
Use [realfavicongenerator.net](https://realfavicongenerator.net/):
1. Upload your logo
2. Generate all sizes
3. Download and extract to `public/icons/`

### 8. Set Up Backup System
Supabase includes automatic backups, but also:
```bash
# Backup script
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

### 9. Configure CDN (Optional)
- Cloudflare for static assets
- Image optimization
- DDoS protection

### 10. Create Status Page
Use [status.io](https://status.io) or build simple:
```typescript
// app/api/health/route.ts
export async function GET() {
  try {
    await supabase.from('markets').select('count').single();
    return Response.json({ status: 'ok', timestamp: Date.now() });
  } catch (error) {
    return Response.json({ status: 'error' }, { status: 500 });
  }
}
```

## Environment Variables for Production

### Required
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Optional (for future features)
```env
# Bitcoin Lightning
BTCPAY_URL=https://your-btcpay-server.com
BTCPAY_API_KEY=your-api-key
BTCPAY_STORE_ID=your-store-id

# Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Error tracking
NEXT_PUBLIC_SENTRY_DSN=https://...

# Rate limiting
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

## Performance Optimization

### 1. Enable Caching
```typescript
// next.config.js
module.exports = {
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=3600, stale-while-revalidate=86400',
        },
      ],
    },
  ],
};
```

### 2. Image Optimization
```typescript
// next.config.js
images: {
  domains: ['your-cdn.com'],
  formats: ['image/avif', 'image/webp'],
}
```

### 3. Database Connection Pooling
Supabase handles this automatically, but monitor:
- Active connections
- Query performance
- Index usage

## Monitoring Dashboard

### Key Metrics to Track
1. **User Metrics**
   - Daily active users
   - New registrations
   - Retention rate

2. **Market Metrics**
   - Markets created
   - Total volume
   - Average liquidity

3. **Performance**
   - Page load time (< 2s)
   - API response time (< 500ms)
   - Error rate (< 1%)

4. **Business**
   - Transaction volume
   - User balance distribution
   - Most popular markets

### Tools
- Vercel Analytics (built-in)
- Supabase Dashboard
- Google Analytics
- Custom dashboard in app

## Security Hardening

### 1. Content Security Policy
```typescript
// next.config.js
headers: {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'",
}
```

### 2. Environment Variable Security
- Never commit `.env.local`
- Use Vercel/Netlify environment variables
- Rotate keys regularly

### 3. API Route Protection
```typescript
// Verify origin
const origin = request.headers.get('origin');
if (!allowedOrigins.includes(origin)) {
  return Response.json({ error: 'Forbidden' }, { status: 403 });
}
```

### 4. SQL Injection Prevention
Supabase client handles this automatically with parameterized queries.

## Rollback Strategy

### If deployment fails:
```bash
# Vercel
vercel rollback

# Netlify
netlify rollback

# Git
git revert HEAD
git push
```

### Database migrations:
```bash
# Always test migrations on staging first
supabase db push --dry-run
```

## Launch Checklist

- [ ] Code deployed to production
- [ ] Environment variables configured
- [ ] Custom domain connected
- [ ] HTTPS enabled
- [ ] PWA icons generated
- [ ] RLS policies enabled
- [ ] Rate limiting configured
- [ ] Analytics tracking active
- [ ] Error monitoring setup
- [ ] Backup system running
- [ ] Status page live
- [ ] Documentation updated
- [ ] Sample markets seeded
- [ ] Mobile testing complete
- [ ] Load testing passed
- [ ] Security audit done

## Maintenance

### Daily
- Check error logs
- Monitor performance metrics
- Respond to user issues

### Weekly
- Review analytics
- Update market data
- Check database performance

### Monthly
- Security updates
- Dependency updates
- Backup verification
- Performance optimization

## Support

### Getting Help
- GitHub Issues
- Community Discord
- Email support@caribpredict.com

### Reporting Security Issues
- security@caribpredict.com
- Do not open public issues for security vulnerabilities

---

## 🎉 Ready to Launch!

Your CaribPredict app is production-ready. Follow this guide to deploy confidently and monitor effectively.

**Good luck with your Caribbean prediction market! 🌴**
