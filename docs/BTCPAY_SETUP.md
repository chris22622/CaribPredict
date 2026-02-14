# BTCPay Server Setup Guide for CaribPredict

This guide will help you set up BTCPay Server integration for Bitcoin/Lightning deposits and withdrawals.

## Prerequisites

- A BTCPay Server instance (self-hosted or third-party)
- Admin access to your BTCPay Server
- CaribPredict deployed and running

## Step 1: Create BTCPay Server Account

### Option A: Self-Hosted (Recommended for Production)
1. Follow the [BTCPay Server deployment guide](https://docs.btcpayserver.org/Deployment/)
2. Use Docker for easy deployment
3. Recommended: Use LunaNode, Voltage, or Raspberry Pi

### Option B: Third-Party Host (Easier for Testing)
1. Visit a BTCPay hosting provider (e.g., LunaNode BTCPay)
2. Create an account
3. Wait for your instance to be provisioned

## Step 2: Create a Store

1. Log in to your BTCPay Server dashboard
2. Click **"Stores"** in the left sidebar
3. Click **"Create a new store"**
4. Fill in:
   - **Store Name:** "CaribPredict"
   - **Default Currency:** USD
5. Click **"Create"**

## Step 3: Connect Your Bitcoin Wallet

1. In your store settings, go to **"Wallets"**
2. Click **"Connect wallet"** for Bitcoin (BTC)
3. Choose one of:
   - **Import from hardware wallet** (Recommended)
   - **Import from seed**
   - **Connect to a node**
4. Follow the wizard to connect your wallet

### Important: Enable Lightning Network (Optional but Recommended)

1. Go to **"Lightning"** in store settings
2. Click **"Setup"** and choose:
   - **LND** (easiest)
   - **c-lightning**
   - **Eclair**
3. Follow setup wizard

## Step 4: Generate API Key

1. Go to **"Account"** → **"Manage Account"** → **"API Keys"**
2. Click **"Generate Key"**
3. Set permissions:
   - ✅ **Create invoice**
   - ✅ **View invoices**
   - ✅ **Create non-approved pull payments**
   - ✅ **View pull payments**
4. Click **"Generate"**
5. **IMPORTANT:** Copy the API key immediately (you won't see it again!)

## Step 5: Get Your Store ID

1. Go to **"Stores"** → **"Settings"**
2. Look at the URL: `https://your-btcpay.com/stores/YOUR_STORE_ID/settings`
3. Copy `YOUR_STORE_ID` from the URL

## Step 6: Configure Webhook

1. In store settings, go to **"Webhooks"**
2. Click **"Create Webhook"**
3. Fill in:
   - **Payload URL:** `https://www.caribpredict.com/api/webhooks/btcpay`
   - **Secret:** Generate a random string (e.g., `openssl rand -hex 32`)
   - **Events:**
     - ✅ Invoice settled
     - ✅ Invoice processing
     - ✅ Payout approved
     - ✅ Payout completed
4. Click **"Add webhook"**

## Step 7: Update CaribPredict Environment Variables

Add these to your `.env.local` file:

```bash
# BTCPay Server Configuration
BTCPAY_HOST=https://your-btcpay-server.com
BTCPAY_API_KEY=your_api_key_from_step_4
BTCPAY_STORE_ID=your_store_id_from_step_5
BTCPAY_WEBHOOK_SECRET=your_webhook_secret_from_step_6

# Site URL for redirects
NEXT_PUBLIC_SITE_URL=https://www.caribpredict.com
```

## Step 8: Deploy and Test

1. **Commit changes:**
```bash
git add .
git commit -m "Add BTCPay Server integration"
git push origin master
```

2. **Add environment variables to Vercel:**
   - Go to Vercel Dashboard → CaribPredict → Settings → Environment Variables
   - Add all BTCPay variables
   - Redeploy

3. **Test deposit flow:**
   - Visit www.caribpredict.com
   - Click on your balance in navbar
   - Click "Deposit"
   - Enter amount (e.g., $10)
   - Click "Pay with Bitcoin"
   - Complete payment on BTCPay checkout
   - Verify balance updates

4. **Test withdrawal flow:**
   - Click "Withdraw" in wallet modal
   - Enter BTC amount
   - Enter your Bitcoin address
   - Click "Withdraw to Bitcoin Address"
   - Check BTCPay dashboard for payout
   - Approve payout in BTCPay (if manual approval enabled)

## Troubleshooting

### Deposits not updating balance

1. Check Vercel logs for webhook errors
2. Verify webhook secret matches in both places
3. Test webhook manually in BTCPay dashboard
4. Check Supabase `transactions` table for pending deposits

### Withdrawals failing

1. Check BTCPay wallet has sufficient balance
2. Verify payout permissions in API key
3. Check Vercel logs for errors
4. Verify Bitcoin address format (should start with bc1, 1, or 3)

### Webhook signature errors

1. Regenerate webhook secret
2. Update both BTCPay webhook and `.env.local`
3. Redeploy application

## Security Best Practices

1. **Use HTTPS only** - Never use HTTP for production
2. **Rotate API keys** regularly (every 90 days)
3. **Enable 2FA** on BTCPay account
4. **Set withdrawal limits** if needed
5. **Monitor webhook logs** for suspicious activity
6. **Backup your wallet seed** securely offline
7. **Use hardware wallet** for BTCPay Server node

## Production Checklist

- [ ] BTCPay Server is self-hosted (not third-party)
- [ ] Bitcoin wallet is connected and funded
- [ ] Lightning Network is enabled
- [ ] API key has correct permissions
- [ ] Webhook is configured and tested
- [ ] All environment variables set in Vercel
- [ ] Deposit flow tested with real BTC
- [ ] Withdrawal flow tested with real BTC
- [ ] 2FA enabled on BTCPay account
- [ ] Wallet seed backed up securely

## Support

- **BTCPay Docs:** https://docs.btcpayserver.org/
- **BTCPay Chat:** https://chat.btcpayserver.org/
- **CaribPredict Issues:** GitHub Issues

## Cost Estimate

**Self-Hosted BTCPay:**
- VPS: $5-20/month (LunaNode, Digital Ocean)
- Bitcoin node: ~500GB storage
- Lightning node: ~10GB storage
- **Total:** ~$10-30/month

**Third-Party Hosted:**
- Free tier: Limited transactions
- Paid: $20-50/month
- **Total:** $0-50/month

## Next Steps

Once BTCPay is configured:
1. Test with small amounts first
2. Monitor for 24-48 hours
3. Gradually increase limits
4. Add Bitcoin logo to marketing materials
5. Announce Bitcoin support to users! 🎉
