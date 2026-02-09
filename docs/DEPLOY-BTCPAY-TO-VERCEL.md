# Deploy BTCPay Integration to Vercel

**Time Required:** 10-15 minutes
**Difficulty:** Beginner

This guide walks you through deploying CaribPredict with BTCPay Server integration to Vercel.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Access Vercel Dashboard](#step-1-access-vercel-dashboard)
3. [Step 2: Add Environment Variables](#step-2-add-environment-variables)
4. [Step 3: Redeploy Application](#step-3-redeploy-application)
5. [Step 4: Verify Deployment](#step-4-verify-deployment)
6. [Step 5: Test BTCPay Integration](#step-5-test-btcpay-integration)
7. [Step 6: Configure BTCPay Webhook](#step-6-configure-btcpay-webhook)
8. [Step 7: End-to-End Testing](#step-7-end-to-end-testing)
9. [Troubleshooting](#troubleshooting)
10. [Rollback Instructions](#rollback-instructions)

---

## Prerequisites

Before you begin, ensure you have:

- [ ] **Vercel Account** with CaribPredict project deployed
- [ ] **BTCPay Server** deployed and configured (see [LUNANODE-BTCPAY-DEPLOYMENT.md](./LUNANODE-BTCPAY-DEPLOYMENT.md))
- [ ] **BTCPay Credentials** ready:
  - BTCPay Host URL
  - API Key
  - Store ID
  - Webhook Secret
- [ ] **Vercel CLI** installed (optional, for command-line deployment)

---

## Step 1: Access Vercel Dashboard

### 1.1 Log In to Vercel

1. Visit **https://vercel.com/**
2. Click **"Login"** in the top-right
3. Sign in with your account (GitHub, GitLab, or Bitbucket)

### 1.2 Select Your Project

1. On your Vercel dashboard, find **"caribpredict"** (or whatever you named it)
2. Click on the project to open it

---

## Step 2: Add Environment Variables

### 2.1 Navigate to Environment Variables

1. Click **"Settings"** in the top navigation
2. In the left sidebar, click **"Environment Variables"**

### 2.2 Add BTCPay Variables

You'll add **4 new environment variables**. For each one:

1. Click **"Add New"** button
2. Fill in the **Key** (variable name)
3. Fill in the **Value** (your credential)
4. Select **Environment**: All (Production, Preview, Development)
5. Click **"Save"**

#### Variable 1: BTCPAY_HOST

- **Key:** `BTCPAY_HOST`
- **Value:** Your BTCPay Server URL
- **Example:** `https://btcpay.caribpredict.com`
- **Important:** No trailing slash!

#### Variable 2: BTCPAY_API_KEY

- **Key:** `BTCPAY_API_KEY`
- **Value:** Your BTCPay API key
- **Example:** `btcpay_Sk1234567890abcdefghijklmnopqrstuvwxyz`
- **Important:** This is sensitive - keep it secret!

#### Variable 3: BTCPAY_STORE_ID

- **Key:** `BTCPAY_STORE_ID`
- **Value:** Your BTCPay Store ID
- **Example:** `ABC123XYZ`
- **How to find:** Check your BTCPay store settings URL

#### Variable 4: BTCPAY_WEBHOOK_SECRET

- **Key:** `BTCPAY_WEBHOOK_SECRET`
- **Value:** Your webhook secret
- **Example:** `a1b2c3d4e5f6789012345678901234567890`
- **Important:** Must match the secret in BTCPay webhook configuration

### 2.3 Verify All Variables

After adding all 4 variables, you should see:

```
BTCPAY_HOST                 Production, Preview, Development
BTCPAY_API_KEY             Production, Preview, Development (Sensitive)
BTCPAY_STORE_ID            Production, Preview, Development
BTCPAY_WEBHOOK_SECRET      Production, Preview, Development (Sensitive)
```

**Vercel automatically hides sensitive values after saving.**

### 2.4 Update NEXT_PUBLIC_SITE_URL (If Needed)

If you haven't set this yet:

- **Key:** `NEXT_PUBLIC_SITE_URL`
- **Value:** `https://www.caribpredict.com` (your production URL)
- **Environment:** All

---

## Step 3: Redeploy Application

Now deploy the updated configuration.

### Option A: Redeploy via Dashboard (Easiest)

1. Go to **"Deployments"** tab (top navigation)
2. Find the most recent successful deployment
3. Click the **three dots (•••)** on the right
4. Click **"Redeploy"**
5. In the popup, click **"Redeploy"** again to confirm

### Option B: Redeploy via Git Push

1. Make a small change to your repository (e.g., add a comment)
2. Commit and push:
   ```bash
   git add .
   git commit -m "Add BTCPay configuration"
   git push origin main
   ```
3. Vercel will automatically detect the push and redeploy

### Option C: Redeploy via Vercel CLI

If you have Vercel CLI installed:

```bash
cd "D:\Bot Projects\CaribPredict"
vercel --prod
```

---

## Step 4: Verify Deployment

### 4.1 Monitor Deployment Progress

1. Go to **"Deployments"** tab
2. You'll see a deployment **"Building"** → **"Ready"**
3. Wait for status to show: ✅ **"Ready"**
4. This usually takes **1-3 minutes**

### 4.2 Check Build Logs

If deployment fails:

1. Click on the failed deployment
2. Click **"Building"** to see build logs
3. Look for errors related to BTCPay or environment variables
4. Common issues:
   - Missing environment variables
   - Syntax errors in `.env.local`
   - TypeScript errors

### 4.3 Check Function Logs

After successful deployment:

1. Go to **"Logs"** tab (top navigation)
2. Filter by **"Functions"**
3. You should see your API routes listed:
   - `/api/deposit`
   - `/api/withdraw`
   - `/api/webhooks/btcpay`

---

## Step 5: Verify Deployment

### 5.1 Check Homepage

1. Visit **https://www.caribpredict.com** (your production URL)
2. Verify the site loads correctly
3. Check for any console errors (F12 → Console tab)

### 5.2 Check Environment Variables in Logs

Test that BTCPay variables are loaded:

1. Go to Vercel **"Logs"** tab
2. Visit your site and click around
3. In logs, search for any BTCPay-related messages
4. You should NOT see errors like "BTCPAY_HOST is undefined"

### 5.3 Test API Endpoint

Test that the deposit API works:

1. Open browser DevTools (F12)
2. Go to **"Console"** tab
3. Run this test:

```javascript
fetch('/api/deposit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'test-user-id',
    amountUSD: 10
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

**Expected result:**
- Success: `{ success: true, checkoutUrl: "...", invoiceId: "..." }`
- Failure: Check error message in response

---

## Step 6: Configure BTCPay Webhook

Now update the webhook URL in BTCPay to point to your production Vercel deployment.

### 6.1 Log In to BTCPay

1. Visit your BTCPay Server (e.g., `https://btcpay.caribpredict.com`)
2. Log in with your credentials

### 6.2 Update/Create Webhook

1. Go to **"Stores"** → **"CaribPredict"** (your store)
2. Click **"Webhooks"** in the left sidebar
3. If webhook exists:
   - Click **"Edit"** on existing webhook
4. If webhook doesn't exist:
   - Click **"Create Webhook"**

### 6.3 Configure Webhook Settings

Fill in/update:

- **Payload URL:** `https://www.caribpredict.com/api/webhooks/btcpay`
  - ⚠️ **Must match your production domain!**
  - ⚠️ **Must be HTTPS!**
- **Secret:** (same secret you added to Vercel env vars)
- **Automatic redelivery:** ✅ Enabled
- **Events:**
  - ✅ Invoice settled
  - ✅ Invoice processing
  - ✅ Invoice invalid
  - ✅ Invoice expired
  - ✅ Payout approved
  - ✅ Payout completed

### 6.4 Test Webhook Delivery

1. Click **"Save"** (or **"Add webhook"**)
2. Find your webhook in the list
3. Click on it to view details
4. Go to **"Deliveries"** tab
5. Click **"Test webhook"**
6. Check result:
   - ✅ **Success:** Green checkmark, HTTP 200
   - ❌ **Failure:** Red X, check error message

**If test fails:**
- Verify webhook URL is correct
- Check Vercel function logs for incoming request
- Verify webhook secret matches in both places

---

## Step 7: End-to-End Testing

Now test the entire Bitcoin deposit flow.

### 7.1 Test Deposit Flow

1. Visit **https://www.caribpredict.com**
2. **Log in** to your test account
3. Click **"Balance"** in the navbar
4. Click **"Deposit"**
5. Enter amount: **$10**
6. Click **"Pay with Bitcoin"**

**Expected result:**
- You should be redirected to BTCPay checkout page
- Page shows Bitcoin payment address and QR code
- Page shows Lightning invoice (if enabled)

### 7.2 Make Test Payment

**Option A: Lightning (Fast)**

If you have a Lightning wallet:
1. Scan the Lightning QR code
2. Confirm payment
3. Wait 1-2 seconds
4. Invoice should show: ✅ **"Paid"**

**Option B: On-Chain (Slower)**

If you have a Bitcoin wallet:
1. Send Bitcoin to the address shown
2. Wait for 1 confirmation (~10 minutes)
3. Invoice should show: ✅ **"Settled"**

### 7.3 Verify Balance Update

1. Return to CaribPredict
2. Check your balance
3. It should update automatically within:
   - Lightning: 1-2 seconds
   - On-chain: ~10 minutes (after 1 confirmation)

**If balance doesn't update:**
- Check Vercel function logs for webhook delivery
- Check BTCPay webhook deliveries tab
- Check Supabase `transactions` table

### 7.4 Test Withdrawal Flow

1. On CaribPredict, click **"Balance"** → **"Withdraw"**
2. Enter amount: **0.0001 BTC** (small test)
3. Enter your Bitcoin address
4. Click **"Withdraw to Bitcoin Address"**

**Expected result:**
- Success message
- Balance deducted immediately
- Payout appears in BTCPay dashboard

### 7.5 Approve Payout in BTCPay

1. Go to BTCPay dashboard
2. Click **"Payouts"** → **"Pending"**
3. Find your test payout
4. Click **"Approve"**
5. Payout processes automatically

### 7.6 Verify Withdrawal Received

1. Check your Bitcoin wallet
2. You should receive the Bitcoin within:
   - Lightning: Instant
   - On-chain: Next Bitcoin block (~10 minutes)

---

## Troubleshooting

### Issue: "BTCPAY_HOST is not defined" Error

**Solution:**
1. Verify environment variables are set in Vercel
2. Ensure you redeployed after adding variables
3. Check variable names match exactly (case-sensitive)

### Issue: Webhook Test Fails with 401 Unauthorized

**Solution:**
1. Check webhook secret matches in both BTCPay and Vercel
2. Regenerate secret if needed:
   ```bash
   openssl rand -hex 32
   ```
3. Update in both places and redeploy

### Issue: Webhook Test Fails with 404 Not Found

**Solution:**
1. Verify webhook URL is correct: `https://www.caribpredict.com/api/webhooks/btcpay`
2. Check that `/api/webhooks/btcpay/route.ts` exists in your code
3. Verify latest deployment includes webhook route

### Issue: Deposit Balance Doesn't Update

**Solution:**
1. Check BTCPay webhook deliveries:
   - Go to BTCPay → Webhooks → Your webhook → Deliveries
   - Look for failed deliveries (red X)
   - Check error message
2. Check Vercel function logs:
   - Go to Vercel → Logs → Filter by "webhooks/btcpay"
   - Look for errors or exceptions
3. Check Supabase `transactions` table:
   - Look for transaction with `btcpay_invoice_id`
   - Check if status is "pending" or "completed"
4. Manually trigger webhook redelivery in BTCPay

### Issue: API Key "Unauthorized" Error

**Solution:**
1. Verify API key is correct (check for copy/paste errors)
2. Check API key permissions in BTCPay:
   - Go to BTCPay → Account → API Keys
   - Verify key has "Create invoice" and "View invoices" permissions
3. Regenerate API key if needed and update Vercel

### Issue: Invoice Creation Fails

**Solution:**
1. Check BTCPay server is running (visit URL in browser)
2. Verify Store ID is correct
3. Check that Bitcoin wallet is connected in BTCPay
4. Look at Vercel function logs for specific error message

---

## Rollback Instructions

If something goes wrong, you can roll back to a previous deployment.

### Option 1: Rollback via Dashboard

1. Go to **"Deployments"** tab
2. Find a previous **"Ready"** deployment (before BTCPay changes)
3. Click **three dots (•••)** → **"Promote to Production"**
4. Confirm promotion

### Option 2: Revert Environment Variables

1. Go to **"Settings"** → **"Environment Variables"**
2. Find the BTCPay variables
3. Click **"Delete"** on each one
4. Redeploy the application

### Option 3: Revert Git Commit

If you committed BTCPay changes:

```bash
cd "D:\Bot Projects\CaribPredict"
git log  # Find commit hash before BTCPay changes
git revert <commit-hash>
git push origin main
```

Vercel will auto-deploy the reverted version.

---

## Post-Deployment Checklist

After successful deployment, verify:

- [ ] **Site loads** at production URL
- [ ] **No console errors** in browser DevTools
- [ ] **Deposit flow works** (redirects to BTCPay)
- [ ] **Webhook delivers** successfully (test in BTCPay)
- [ ] **Balance updates** after test payment
- [ ] **Withdrawal creates** payout in BTCPay
- [ ] **Logs are clean** (no errors in Vercel logs)
- [ ] **Environment variables** are all set
- [ ] **Test payment received** in your wallet

---

## Monitoring

### Daily Checks

1. **Vercel Dashboard → Logs**
   - Check for errors or exceptions
   - Monitor API response times

2. **BTCPay Dashboard**
   - Check for pending payouts
   - Review webhook delivery success rate

3. **Supabase**
   - Check `transactions` table for stuck transactions
   - Verify balance updates are working

### Weekly Checks

1. **Test deposit** with small amount ($1-5)
2. **Test withdrawal** with small amount
3. **Review webhook logs** for any failures
4. **Check BTCPay storage** (should have 20%+ free)

---

## Security Reminders

- ✅ **Never commit** `.env.local` to Git
- ✅ **Use strong secrets** for webhook (32+ characters)
- ✅ **Enable 2FA** on Vercel and BTCPay accounts
- ✅ **Rotate API keys** every 90 days
- ✅ **Monitor logs** for suspicious activity
- ✅ **Limit API permissions** to only what's needed

---

## Support

If you run into issues:

1. **Check Documentation:**
   - [LUNANODE-BTCPAY-DEPLOYMENT.md](./LUNANODE-BTCPAY-DEPLOYMENT.md)
   - [BTCPAY_SETUP.md](./BTCPAY_SETUP.md)

2. **Check Logs:**
   - Vercel function logs
   - BTCPay webhook deliveries
   - Browser console

3. **Test Components:**
   - BTCPay server status
   - API authentication
   - Webhook signature validation

4. **Ask for Help:**
   - BTCPay Community: https://chat.btcpayserver.org/
   - Vercel Support: https://vercel.com/support

---

## Success!

If you've completed all steps, your CaribPredict application is now live with Bitcoin payments! 🎉

**What you've accomplished:**

✅ Deployed BTCPay integration to production
✅ Configured secure webhook communication
✅ Tested Bitcoin deposits and withdrawals
✅ Enabled Lightning Network payments (instant & cheap)
✅ Set up monitoring and logging

**Next steps:**

1. Monitor for 24-48 hours to ensure stability
2. Start with small deposits to build confidence
3. Gradually increase limits as you gain experience
4. Market your Bitcoin support to users
5. Consider adding more payment options (Lightning addresses, LNURL, etc.)

---

**Document Version:** 1.0
**Last Updated:** February 9, 2026
**Maintainer:** CaribPredict Team
