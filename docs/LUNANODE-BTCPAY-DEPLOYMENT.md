# Complete LunaNode BTCPay Server Deployment Guide for CaribPredict

**Last Updated:** February 9, 2026
**Estimated Time:** 45-60 minutes
**Difficulty:** Beginner-Friendly
**Monthly Cost:** $10 USD (LunaNode m.4 VM)

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Phase 1: LunaNode Account Setup](#phase-1-lunanode-account-setup)
4. [Phase 2: Deploy BTCPay Server](#phase-2-deploy-btcpay-server)
5. [Phase 3: Initial BTCPay Configuration](#phase-3-initial-btcpay-configuration)
6. [Phase 4: Configure Bitcoin Wallet](#phase-4-configure-bitcoin-wallet)
7. [Phase 5: Enable Lightning Network](#phase-5-enable-lightning-network)
8. [Phase 6: Generate API Credentials](#phase-6-generate-api-credentials)
9. [Phase 7: Setup Webhooks](#phase-7-setup-webhooks)
10. [Phase 8: Test Your Setup](#phase-8-test-your-setup)
11. [Phase 9: Connect to CaribPredict](#phase-9-connect-to-caribpredict)
12. [Troubleshooting](#troubleshooting)
13. [Security Checklist](#security-checklist)
14. [Maintenance](#maintenance)

---

## Overview

This guide will walk you through deploying your own BTCPay Server on LunaNode and connecting it to CaribPredict. BTCPay Server is open-source Bitcoin payment processor software that allows CaribPredict to accept Bitcoin deposits and process Bitcoin withdrawals without any third-party payment processor.

**What You'll Build:**
- A self-hosted BTCPay Server instance on LunaNode
- Bitcoin wallet for on-chain payments
- Lightning Network node for instant, low-fee payments
- Secure API connection to CaribPredict
- Automated webhook notifications for deposits/withdrawals

**Why LunaNode?**
- One-click BTCPay installation (no technical setup required)
- Affordable pricing ($10/month for recommended specs)
- Bitcoin-friendly company
- Excellent uptime and support
- Pre-configured security and SSL certificates

---

## Prerequisites

Before you begin, ensure you have:

- [ ] **LunaNode Account** with $10+ credit (funded via Bitcoin, credit card, or PayPal)
- [ ] **Domain Name** (optional but recommended - e.g., btcpay.caribpredict.com)
- [ ] **Email Address** for BTCPay notifications
- [ ] **CaribPredict Access** (admin access to your deployed app)
- [ ] **2-3 Hours of Time** (mostly waiting for Bitcoin blockchain sync)

**No Coding Knowledge Required!** This guide assumes zero blockchain or server experience.

---

## Phase 1: LunaNode Account Setup

### Step 1.1: Create LunaNode Account

1. Visit **https://www.lunanode.com/**
2. Click **"Sign Up"** in the top-right corner
3. Fill in your details:
   - **Email Address:** (use a secure email)
   - **Password:** (use a strong, unique password)
   - **Company Name:** CaribPredict (or your name)
4. Click **"Create Account"**
5. Check your email and **verify your account**

### Step 1.2: Add Credit to Your Account

1. Log in to your LunaNode dashboard
2. Click **"Billing"** in the left sidebar
3. Click **"Add Credit"**
4. Choose your payment method:
   - **Bitcoin** (recommended, instant)
   - **Credit Card** (via Stripe)
   - **PayPal**
5. Add **$20 USD** (covers 2 months + buffer)
6. Complete the payment

**Note:** LunaNode bills hourly. The m.4 VM costs approximately $0.014/hour ($10/month).

### Step 1.3: Verify Your Account

1. Go to **"Account Settings"**
2. Enable **Two-Factor Authentication (2FA)**:
   - Click **"Enable 2FA"**
   - Scan QR code with Google Authenticator or Authy
   - Enter verification code
   - **Save your backup codes securely!**

---

## Phase 2: Deploy BTCPay Server

LunaNode offers a **one-click BTCPay installer** that does all the heavy lifting for you.

### Step 2.1: Access BTCPay Launcher

1. In your LunaNode dashboard, click **"Launch"** in the top menu
2. Select **"Apps"** tab
3. Find **"BTCPay Server"** and click **"Deploy"**

### Step 2.2: Configure Your BTCPay Instance

You'll see a configuration form. Fill it out carefully:

#### Basic Configuration

**Hostname:**
- If you have a domain: `btcpay.caribpredict.com`
- If you don't have a domain: Leave blank (LunaNode will provide one like `btcpay-12345.lunanode.com`)

**Email Address:**
- Enter your email (used for Let's Encrypt SSL certificates and notifications)
- Example: `admin@caribpredict.com`

**VM Plan:**
- Select **"m.4"** (Recommended)
  - 2 GB RAM
  - 2 vCPU
  - 80 GB SSD
  - $10/month
- **Do NOT choose smaller plans** - Bitcoin node requires significant storage

**Region:**
- Choose the region closest to your users
- Recommended: `Toronto` (North America) or `Montreal`

#### Advanced Options (Leave as Default)

- **Bitcoin Network:** Mainnet (leave default)
- **Lightning Implementation:** LND (leave default)
- **Pruning:** Disabled (keep full blockchain for reliability)

### Step 2.3: Deploy the Instance

1. Review your configuration
2. Click **"Create VM"**
3. Wait 2-3 minutes for VM provisioning
4. You'll see your new VM in the **"Virtual Machines"** dashboard

### Step 2.4: Get Your BTCPay URL

1. Click on your new BTCPay VM
2. Find the **IP Address** (e.g., `192.168.1.100`)
3. Your BTCPay URL is either:
   - **With domain:** `https://btcpay.caribpredict.com`
   - **Without domain:** `https://[YOUR-IP]` (may show SSL warning initially)

**Important:** If using a custom domain, configure DNS now:

### Step 2.5: Configure DNS (If Using Custom Domain)

1. Log in to your domain registrar (Namecheap, GoDaddy, Cloudflare, etc.)
2. Go to DNS settings for `caribpredict.com`
3. Add an **A record**:
   - **Type:** A
   - **Name:** btcpay
   - **Value:** [Your LunaNode VM IP address]
   - **TTL:** 300 (5 minutes)
4. Save and wait 5-10 minutes for DNS propagation
5. Verify: `ping btcpay.caribpredict.com` should return your IP

### Step 2.6: Wait for Bitcoin Blockchain Sync

**This is the longest part!**

1. Visit your BTCPay URL (via IP or domain)
2. You'll see a **"Bitcoin blockchain is syncing"** message
3. Initial sync takes **2-4 hours** (downloads ~500GB of blockchain data)
4. Check progress at: **https://your-btcpay-url/server/maintenance**

**You can proceed to Phase 3 while syncing!**

---

## Phase 3: Initial BTCPay Configuration

While the blockchain syncs, set up your BTCPay account.

### Step 3.1: Create Your Admin Account

1. Visit your BTCPay URL
2. Click **"Register"** (first user is always admin)
3. Fill in:
   - **Email:** Your admin email
   - **Password:** Strong password (12+ characters, mixed case, numbers, symbols)
   - **Confirm Password:** Same password
4. Click **"Register"**
5. **You're now logged in as admin!**

### Step 3.2: Enable Two-Factor Authentication (2FA)

**CRITICAL for security!**

1. Click your email address (top-right) → **"Manage Account"**
2. Go to **"Two-Factor Authentication"** tab
3. Click **"Set up authenticator app"**
4. Scan QR code with Google Authenticator or Authy
5. Enter the 6-digit code
6. Click **"Enable 2FA"**
7. **Save your recovery codes somewhere safe!**

### Step 3.3: Configure Email Notifications (Optional)

1. Go to **"Server Settings"** → **"Emails"**
2. Enter your SMTP server details:
   - **SMTP Server:** smtp.gmail.com (for Gmail)
   - **Port:** 587
   - **Username:** your-email@gmail.com
   - **Password:** (App password if using Gmail)
   - **From Address:** btcpay@caribpredict.com
3. Click **"Test"** to verify
4. Click **"Save"**

**Skip this if you don't have SMTP - it's optional.**

---

## Phase 4: Configure Bitcoin Wallet

Once the blockchain is fully synced, set up your Bitcoin wallet.

### Step 4.1: Create a Store

1. Click **"Stores"** in the left sidebar
2. Click **"Create a new store"**
3. Fill in:
   - **Store Name:** CaribPredict
   - **Default Currency:** USD
   - **Price Source:** CoinGecko (default)
4. Click **"Create"**

### Step 4.2: Generate a New Wallet

**We'll use BTCPay's internal wallet for simplicity.**

1. In your store, go to **"Wallets"** → **"Bitcoin"**
2. Click **"Setup"** (or **"Modify"**)
3. Select **"Create a new wallet"**
4. Choose:
   - **Hot wallet** (easier, stored on server)
   - **Watch-only wallet** (more secure, requires hardware wallet)
5. For beginners, choose **"Hot wallet"**

### Step 4.3: Generate Seed Phrase

**CRITICAL: This is your Bitcoin! Protect this seed phrase with your life!**

1. BTCPay will generate a **12-word seed phrase**
2. **Write it down on paper** (do NOT store digitally)
3. Store in a **safe place** (fireproof safe, bank deposit box)
4. Check the box **"I have written down my seed phrase"**
5. Click **"Confirm"**

**Important:** Anyone with this seed phrase can steal your Bitcoin. NEVER share it.

### Step 4.4: Verify Wallet Connection

1. Go to **"Wallets"** → **"Bitcoin"**
2. You should see:
   - ✅ **Status:** Connected
   - **Balance:** 0 BTC (initially)
   - **Address:** A Bitcoin address starting with `bc1...`
3. Click **"Generate new address"** to test

---

## Phase 5: Enable Lightning Network

Lightning Network enables instant, low-fee Bitcoin payments (highly recommended).

### Step 5.1: Enable Lightning in Store

1. In your store, go to **"Lightning"** → **"Settings"**
2. Click **"Setup"** (or **"Modify"**)
3. Select **"Use internal node (LND)"**
4. Click **"Enable"**

### Step 5.2: Wait for LND Sync

1. Lightning node will sync with Bitcoin blockchain
2. Takes **5-10 minutes** after Bitcoin sync completes
3. Check status: **"Lightning"** → **"Information"**
4. Wait until status shows: ✅ **"Synced to chain"**

### Step 5.3: Fund Your Lightning Node

**Lightning requires Bitcoin in channels to work.**

1. Go to **"Lightning"** → **"Manage"**
2. Click **"Open Channel"**
3. Connect to a well-connected node:
   - **Node:** `ACINQ` or `Bitrefill` (search in "Suggested Nodes")
   - **Amount:** 0.01 BTC (about $400 - adjust based on your needs)
4. Click **"Open Channel"**
5. Wait for **3 confirmations** (~30 minutes)

**You can skip Lightning initially and add it later.**

---

## Phase 6: Generate API Credentials

Now create API credentials for CaribPredict to communicate with BTCPay.

### Step 6.1: Create API Key

1. Click your email (top-right) → **"Manage Account"**
2. Go to **"API Keys"** tab
3. Click **"Generate Key"**
4. Label: `CaribPredict Production`
5. Select **Permissions**:
   - ✅ **View invoices**
   - ✅ **Create invoice**
   - ✅ **Modify invoices**
   - ✅ **Modify stores' webhooks**
   - ✅ **View your stores**
   - ✅ **Create non-approved pull payments**
   - ✅ **View pull payments**
6. Click **"Generate"**

### Step 6.2: Save Your API Key

**CRITICAL: You'll only see this once!**

1. Copy the API key (long string starting with `btcpay_...`)
2. Save it securely (password manager or encrypted note)
3. You'll need this in Phase 9

**Example:**
```
btcpay_Sk1234567890abcdefghijklmnopqrstuvwxyz1234567890
```

### Step 6.3: Get Your Store ID

1. Go to **"Stores"** → **"Settings"**
2. Look at the URL in your browser:
   ```
   https://btcpay.caribpredict.com/stores/ABC123XYZ/settings
   ```
3. Your **Store ID** is the part between `/stores/` and `/settings/`
4. In the example above: `ABC123XYZ`
5. Copy and save this

---

## Phase 7: Setup Webhooks

Webhooks notify CaribPredict when deposits are paid or withdrawals are processed.

### Step 7.1: Generate Webhook Secret

On your local computer, open **Terminal** (Mac/Linux) or **Command Prompt** (Windows):

**Mac/Linux:**
```bash
openssl rand -hex 32
```

**Windows (PowerShell):**
```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

**Or use an online generator:** https://www.random.org/strings/

Copy the generated secret (e.g., `a1b2c3d4e5f6...`)

### Step 7.2: Create Webhook in BTCPay

1. In your store, go to **"Webhooks"**
2. Click **"Create Webhook"**
3. Fill in:
   - **Payload URL:** `https://www.caribpredict.com/api/webhooks/btcpay`
   - **Secret:** (paste the secret you generated)
   - **Automatic redelivery:** ✅ Enabled
   - **Events to send:**
     - ✅ **Invoice settled**
     - ✅ **Invoice processing**
     - ✅ **Invoice invalid**
     - ✅ **Invoice expired**
     - ✅ **Payout approved**
     - ✅ **Payout completed**
4. Click **"Add webhook"**

### Step 7.3: Test Webhook (Optional)

1. In the webhook list, click on your webhook
2. Click **"Deliveries"** tab
3. Click **"Test webhook"**
4. Check that delivery succeeds (shows green checkmark)

**If it fails, that's okay - your CaribPredict isn't deployed yet.**

---

## Phase 8: Test Your Setup

Before connecting to CaribPredict, test BTCPay manually.

### Step 8.1: Create Test Invoice

1. Go to **"Invoices"**
2. Click **"Create Invoice"**
3. Fill in:
   - **Amount:** 10
   - **Currency:** USD
   - **Order ID:** test-001
   - **Buyer Email:** test@example.com
4. Click **"Create"**

### Step 8.2: View Invoice

1. BTCPay will generate a checkout page
2. Click **"View invoice"**
3. You'll see:
   - Bitcoin on-chain payment option
   - Lightning Network payment option (if enabled)
   - QR code
   - Payment address

**Do NOT pay this invoice yet** - we'll test with real payments later.

### Step 8.3: Check Wallet Balance

1. Go to **"Wallets"** → **"Bitcoin"**
2. Verify you can see:
   - Your balance
   - Recent transactions
   - Ability to generate new addresses

---

## Phase 9: Connect to CaribPredict

Now integrate BTCPay with your CaribPredict application.

### Step 9.1: Gather Your Credentials

You should have these from previous steps:

1. **BTCPAY_HOST:** Your BTCPay URL
   - Example: `https://btcpay.caribpredict.com`
   - Or: `https://192.168.1.100` (if no domain)

2. **BTCPAY_API_KEY:** From Phase 6, Step 6.2
   - Example: `btcpay_Sk1234567890abcdefghijklmnopqrstuvwxyz`

3. **BTCPAY_STORE_ID:** From Phase 6, Step 6.3
   - Example: `ABC123XYZ`

4. **BTCPAY_WEBHOOK_SECRET:** From Phase 7, Step 7.1
   - Example: `a1b2c3d4e5f6789012345678901234567890`

### Step 9.2: Update Local Environment

On your development machine:

1. Navigate to CaribPredict project:
   ```bash
   cd "D:\Bot Projects\CaribPredict"
   ```

2. Open `.env.local` in a text editor

3. Add/update these lines:
   ```bash
   # BTCPay Server Configuration
   BTCPAY_HOST=https://btcpay.caribpredict.com
   BTCPAY_API_KEY=btcpay_Sk1234567890abcdefghijklmnopqrstuvwxyz
   BTCPAY_STORE_ID=ABC123XYZ
   BTCPAY_WEBHOOK_SECRET=a1b2c3d4e5f6789012345678901234567890

   # Site URL (should match your production URL)
   NEXT_PUBLIC_SITE_URL=https://www.caribpredict.com
   ```

4. Save the file

### Step 9.3: Test Locally

1. Run CaribPredict locally:
   ```bash
   npm run dev
   ```

2. Visit `http://localhost:3000`

3. Log in to your account

4. Try to create a deposit:
   - Click balance in navbar
   - Click "Deposit"
   - Enter amount: $10
   - Click "Pay with Bitcoin"

5. You should be redirected to your BTCPay checkout page

**If this works, BTCPay integration is successful!**

### Step 9.4: Deploy to Production (Vercel)

See the dedicated guide: **[DEPLOY-BTCPAY-TO-VERCEL.md](./DEPLOY-BTCPAY-TO-VERCEL.md)**

Quick summary:

1. Go to Vercel Dashboard
2. Select CaribPredict project
3. Go to **Settings** → **Environment Variables**
4. Add all four BTCPay variables
5. Redeploy the application

---

## Troubleshooting

### Issue: BTCPay URL shows "Connection refused"

**Solution:**
1. Check VM is running in LunaNode dashboard
2. Verify firewall allows ports 80 and 443
3. Wait 10 minutes after VM creation for services to start
4. Restart VM: Click VM → "Reboot"

### Issue: "Bitcoin blockchain is syncing" for 24+ hours

**Solution:**
1. Check server specifications (should be m.4 or higher)
2. LunaNode uses fast sync - should complete in 2-4 hours
3. Check logs: SSH into server and run `docker logs btcpayserver-bitcoin`
4. Contact LunaNode support if stuck

### Issue: Lightning channels won't open

**Solution:**
1. Ensure Bitcoin wallet has sufficient balance (0.01+ BTC)
2. Wait for Bitcoin transaction to confirm (view in Wallets → Bitcoin)
3. Verify LND is synced: Lightning → Information
4. Try opening to different node (use "Suggested Nodes" list)

### Issue: API key gives "Unauthorized" error

**Solution:**
1. Verify API key is correct (no extra spaces)
2. Check API key permissions include "Create invoice" and "View invoices"
3. Regenerate API key if needed
4. Ensure BTCPAY_HOST includes `https://` and no trailing slash

### Issue: Webhooks not firing

**Solution:**
1. Check webhook URL is correct: `https://www.caribpredict.com/api/webhooks/btcpay`
2. Verify webhook secret matches in both BTCPay and `.env.local`
3. Check Vercel logs for incoming webhook requests
4. Test webhook manually in BTCPay dashboard
5. Ensure CaribPredict is deployed (webhooks to localhost won't work)

### Issue: Invoices expire before payment

**Solution:**
1. Go to Store Settings → Checkout Experience
2. Increase "Invoice Expiration": 60 minutes (default is 15)
3. Enable "Payment Tolerance": 1% (allows slight underpayment)

### Issue: Deposit balance not updating

**Solution:**
1. Check Supabase `transactions` table for pending transaction
2. Verify webhook was received (check Vercel logs)
3. Check BTCPay webhook delivery status
4. Manually trigger webhook redelivery in BTCPay

---

## Security Checklist

Before going to production, verify:

- [ ] **2FA enabled** on BTCPay account
- [ ] **2FA enabled** on LunaNode account
- [ ] **Seed phrase** written down and stored safely offline
- [ ] **Seed phrase** NOT stored digitally (no photos, no cloud)
- [ ] **API key** stored securely (Vercel env vars, not in code)
- [ ] **Webhook secret** is random and strong (32+ characters)
- [ ] **HTTPS** enabled (automatic with LunaNode)
- [ ] **Email notifications** configured for BTCPay
- [ ] **Regular backups** scheduled (see Maintenance section)
- [ ] **Server firewall** configured (only ports 80, 443, 22 open)
- [ ] **Strong passwords** everywhere (12+ characters)
- [ ] **Password manager** used for all credentials

---

## Maintenance

### Daily Tasks

- Check BTCPay dashboard for pending transactions
- Monitor Lightning channel capacity
- Review webhook delivery logs

### Weekly Tasks

- Check Bitcoin and Lightning balance
- Review transaction history for anomalies
- Verify webhook delivery success rate (should be 99%+)
- Check server disk space (should have 20%+ free)

### Monthly Tasks

- Update BTCPay Server (notifications appear in dashboard)
- Rotate API keys (good practice)
- Review and approve pending payouts
- Backup wallet seed phrase location verification
- Check LunaNode billing (ensure sufficient credit)

### Backups

**BTCPay automatically backs up wallet and settings.**

To manually backup:

1. Go to **Server Settings** → **Maintenance**
2. Click **"Download database backup"**
3. Save file to secure location (encrypted USB drive)
4. Also backup your seed phrase (should already be offline)

**Schedule:** Weekly backups before making any configuration changes.

### Updating BTCPay

When updates are available:

1. BTCPay will show notification in dashboard
2. Go to **Server Settings** → **Maintenance**
3. Click **"Update"**
4. Wait 5-10 minutes for update to complete
5. Verify all features work after update

**Downtime:** Usually <2 minutes per update.

---

## Cost Breakdown

### Monthly Costs

| Item | Cost |
|------|------|
| LunaNode m.4 VM | $10.00 |
| Domain (optional) | $1.00 |
| **Total** | **$11.00** |

### Transaction Costs

- **Bitcoin On-Chain:** ~$1-5 per transaction (varies with network fees)
- **Lightning Network:** <$0.01 per transaction (nearly free)
- **BTCPay Server:** $0 (open-source, no payment processor fees)

**Comparison to Traditional Processors:**
- Stripe/PayPal: 2.9% + $0.30 per transaction
- BTCPay: $0 fees (only Bitcoin network fees)

---

## Next Steps

Now that BTCPay is deployed:

1. ✅ **Test with Small Amount:** Deposit $5-10 to verify everything works
2. ✅ **Monitor for 24 Hours:** Ensure webhooks fire correctly
3. ✅ **Test Withdrawal:** Try withdrawing to your personal Bitcoin wallet
4. ✅ **Enable Lightning:** Add Lightning funding for instant deposits
5. ✅ **Update Documentation:** Add Bitcoin payment info to CaribPredict help docs
6. ✅ **Market Your Bitcoin Support:** Announce to users via email/social media

---

## Support Resources

### BTCPay Server

- **Documentation:** https://docs.btcpayserver.org/
- **Community Chat:** https://chat.btcpayserver.org/
- **GitHub Issues:** https://github.com/btcpayserver/btcpayserver/issues
- **YouTube Tutorials:** https://www.youtube.com/c/BTCPayServer

### LunaNode

- **Support Tickets:** https://www.lunanode.com/panel/support
- **Documentation:** https://wiki.lunanode.com/
- **Status Page:** https://status.lunanode.com/

### CaribPredict Integration

- Check **[BTCPAY_SETUP.md](./BTCPAY_SETUP.md)** for integration details
- Check **[DEPLOY-BTCPAY-TO-VERCEL.md](./DEPLOY-BTCPAY-TO-VERCEL.md)** for deployment steps
- Review API code in `D:\Bot Projects\CaribPredict\lib\btcpay.ts`

---

## Congratulations!

You've successfully deployed BTCPay Server on LunaNode! Your CaribPredict platform can now accept Bitcoin deposits and process Bitcoin withdrawals completely autonomously.

**Your BTCPay Server Details:**

- **URL:** https://btcpay.caribpredict.com (or your configured domain)
- **Admin Email:** [Your email]
- **Store:** CaribPredict
- **Lightning:** Enabled ⚡
- **Status:** 🟢 Operational

**What You've Accomplished:**

✅ Self-hosted Bitcoin payment processor
✅ No third-party payment fees
✅ Lightning Network for instant payments
✅ Secure API integration with CaribPredict
✅ Automated deposits and withdrawals
✅ Complete control over your Bitcoin infrastructure

**Now go make that money! 🚀💰**

---

**Document Version:** 1.0
**Last Updated:** February 9, 2026
**Maintainer:** CaribPredict Team
