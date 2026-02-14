# BTCPay Server - Vercel Configuration

## Status
✅ **Vercel Build Error Fixed** - BTCPay client now lazy-loads
✅ **BTCPay Store Created** - "CaribPredict" on mainnet.demo.btcpayserver.org
🔄 **API Key Generation** - In progress (browser disconnected)

## BTCPay Details

**Host**: `https://mainnet.demo.btcpayserver.org`
**Store ID**: `8BXPvaeayNM4iAyftfQuSGZfTaxFX8W751dB7HDRTN7h`
**Store Name**: CaribPredict

## Steps to Complete Setup

### 1. Generate BTCPay API Key

1. Go to: https://mainnet.demo.btcpayserver.org/account/addapikey
2. Fill in Label: `CaribPredict Production`
3. Select these permissions:
   - ✅ View invoices
   - ✅ Create an invoice
   - ✅ Modify invoices
   - ✅ Modify stores webhooks
   - ✅ View your payment requests
   - ✅ Modify your payment requests (for withdrawals)
4. Click **Generate API Key**
5. **COPY THE API KEY IMMEDIATELY** (shown only once!)

### 2. Add Environment Variables to Vercel

Go to: https://vercel.com/chris-projects-fff7033f/carib-predict/settings/environment-variables

Add these variables:

```
BTCPAY_HOST=https://mainnet.demo.btcpayserver.org
BTCPAY_API_KEY=<paste_api_key_from_step_1>
BTCPAY_STORE_ID=8BXPvaeayNM4iAyftfQuSGZfTaxFX8W751dB7HDRTN7h
BTCPAY_WEBHOOK_SECRET=<generate_random_string>
```

**To generate webhook secret**, run in terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Configure Webhook in BTCPay

1. Go to: https://mainnet.demo.btcpayserver.org/stores/8BXPvaeayNM4iAyftfQuSGZfTaxFX8W751dB7HDRTN7h/webhooks
2. Click "Create Webhook"
3. Fill in:
   - **Payload URL**: `https://carib-predict.vercel.app/api/webhooks/btcpay`
   - **Secret**: (use the same secret from step 2)
   - **Events**: Select:
     - ✅ Invoice settled
     - ✅ Invoice processing
     - ✅ Payout approved
     - ✅ Payout completed
4. Click "Add webhook"

### 4. Redeploy on Vercel

After adding environment variables:
1. Go to Deployments tab
2. Click the three dots on the latest deployment
3. Click "Redeploy"
4. Wait for deployment to complete

### 5. Test the Integration

#### Test Deposit:
1. Visit https://carib-predict.vercel.app
2. Click on Balance/Wallet button in navbar
3. Click "Deposit" tab
4. Enter amount: $10
5. Click "Pay with Bitcoin"
6. Should redirect to BTCPay checkout page

#### Test Withdrawal:
1. Click "Withdraw" tab in wallet modal
2. Enter BTC amount: 0.0001
3. Enter Bitcoin address (testnet or mainnet)
4. Click "Withdraw to Bitcoin Address"
5. Should create payout in BTCPay dashboard

## Current Build Status

**Latest Commit**: `fc189d2` - Fix: Lazy-load BTCPay client to prevent build errors when env vars not set

**Changes Made**:
- Modified `lib/btcpay.ts` to lazy-load the BTCPay client
- Client only initializes when actually used (at runtime)
- Build no longer fails when env vars are missing
- Clear error message if BTCPay is used without configuration

## Troubleshooting

### Build fails on Vercel
- ✅ **FIXED** - BTCPay client is now lazy-loaded

### Deposits not working
- Check Vercel logs for errors
- Verify all 4 environment variables are set
- Verify BTCPay API key has "Create invoice" permission

### Withdrawals not working
- Verify API key has "Modify payment requests" permission
- Check BTCPay store has sufficient Bitcoin balance
- Verify Bitcoin address format is correct

### Webhook not receiving events
- Verify webhook secret matches in both places
- Check webhook URL is correct: `/api/webhooks/btcpay`
- Test webhook in BTCPay dashboard manually

## Demo vs Production

**Current Setup**: BTCPay Foundation Demo Server (mainnet.demo.btcpayserver.org)
- **Pros**: Free, no setup required, already configured
- **Cons**: Shared server, resets periodically, no control

**For Production**: Deploy your own BTCPay Server
- Use LunaNode launcher: https://launchbtcpay.lunanode.com/
- Or use docker-compose on any VPS
- Cost: ~$10-20/month
- Full control, permanent data

## Next Steps After BTCPay Works

1. Test with real small Bitcoin amounts ($1-5)
2. Monitor Vercel logs for errors
3. Add transaction history display
4. Add email notifications for deposits/withdrawals
5. Consider setting up your own BTCPay Server for production
