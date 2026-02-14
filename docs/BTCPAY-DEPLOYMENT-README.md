# BTCPay Server Deployment - Complete Guide

**Mission:** Deploy BTCPay Server on LunaNode and integrate it with CaribPredict for Bitcoin payments.

---

## 📋 What This Is

This folder contains everything you need to:

1. Deploy your own BTCPay Server on LunaNode (Bitcoin payment processor)
2. Configure Bitcoin and Lightning Network wallets
3. Generate secure API credentials
4. Connect BTCPay to your CaribPredict application
5. Deploy to production on Vercel
6. Test and verify the integration

**No blockchain or server experience required!** These guides are written for complete beginners.

---

## 📚 Documentation Files

### 1. **[LUNANODE-BTCPAY-DEPLOYMENT.md](./LUNANODE-BTCPAY-DEPLOYMENT.md)** ⭐ START HERE
**The main guide** - Walks you through the entire deployment process step-by-step.

**What's inside:**
- LunaNode account setup and funding
- BTCPay Server one-click deployment
- Bitcoin wallet configuration
- Lightning Network setup
- API credentials generation
- Webhook configuration
- Security best practices
- Troubleshooting common issues

**Time:** 45-60 minutes (mostly waiting for blockchain sync)
**Difficulty:** Beginner-friendly

### 2. **[DEPLOY-BTCPAY-TO-VERCEL.md](./DEPLOY-BTCPAY-TO-VERCEL.md)**
**Vercel deployment guide** - Deploy your BTCPay integration to production.

**What's inside:**
- Adding environment variables to Vercel
- Redeploying your application
- Testing the production deployment
- Configuring webhooks
- End-to-end testing checklist
- Rollback instructions if something goes wrong

**Time:** 10-15 minutes
**Difficulty:** Beginner

### 3. **[BTCPAY-QUICK-REFERENCE.md](./BTCPAY-QUICK-REFERENCE.md)** 🔖 BOOKMARK THIS
**One-page reference** - All your credentials, endpoints, and commands in one place.

**What's inside:**
- Credentials template
- API endpoints with examples
- Webhook event payloads
- Test commands
- Common issues and fixes
- Monitoring checklist
- Pro tips

**Time:** Reference only
**Use:** Keep this open for quick lookups

### 4. **[BTCPAY_SETUP.md](./BTCPAY_SETUP.md)**
**General BTCPay setup guide** - Alternative to the LunaNode-specific guide.

**What's inside:**
- General BTCPay deployment options
- Self-hosting vs third-party hosting
- Wallet setup
- API configuration
- Webhook setup

**Time:** Variable
**Use:** If you're not using LunaNode

---

## 🚀 Quick Start (3 Steps)

### Step 1: Deploy BTCPay Server

```bash
# Read the main guide
docs/LUNANODE-BTCPAY-DEPLOYMENT.md
```

Follow Phase 1-8 to:
- Create LunaNode account
- Deploy BTCPay Server (one-click)
- Configure wallets and Lightning
- Generate API credentials

**Result:** Working BTCPay Server at `https://btcpay.caribpredict.com`

### Step 2: Connect to CaribPredict

```bash
# Windows users - run this in project root:
scripts\setup-btcpay-env.bat

# Mac/Linux users - run this in project root:
bash scripts/setup-btcpay-env.sh
```

This interactive script will:
- Prompt you for BTCPay credentials
- Test the connection
- Update your `.env.local` file
- Generate a credentials reference file

**Result:** Local environment configured and tested

### Step 3: Deploy to Production

```bash
# Read the Vercel guide
docs/DEPLOY-BTCPAY-TO-VERCEL.md
```

Follow the guide to:
- Add environment variables to Vercel
- Redeploy your application
- Test Bitcoin deposits and withdrawals

**Result:** CaribPredict live with Bitcoin payments!

---

## 🛠️ Setup Scripts

### Windows: `scripts\setup-btcpay-env.bat`

Interactive script for Windows users.

**Features:**
- Validates BTCPay credentials
- Tests API connection
- Updates `.env.local` automatically
- Generates quick reference file
- Color-coded output

**Usage:**
```cmd
cd "D:\Bot Projects\CaribPredict"
scripts\setup-btcpay-env.bat
```

### Mac/Linux: `scripts/setup-btcpay-env.sh`

Interactive script for Mac/Linux users.

**Features:**
- Same as Windows version
- Uses curl and jq for testing
- Bash-compatible
- Pretty formatting

**Usage:**
```bash
cd "D:\Bot Projects\CaribPredict"
bash scripts/setup-btcpay-env.sh
```

---

## 💰 Cost Breakdown

### Monthly Costs

| Item | Cost | Notes |
|------|------|-------|
| LunaNode VM (m.4) | $10.00 | Bitcoin node + BTCPay Server |
| Domain (optional) | $1.00 | e.g., btcpay.caribpredict.com |
| **Total** | **$11.00** | One-time setup: ~$20-30 |

### Transaction Costs

| Method | Cost | Speed |
|--------|------|-------|
| Bitcoin On-Chain | $1-5 | 10-60 minutes |
| Lightning Network | <$0.01 | Instant |
| BTCPay Processor Fee | $0 | No middleman! |

**Compare to:**
- Stripe/PayPal: 2.9% + $0.30 per transaction
- Coinbase Commerce: 1% per transaction
- BTCPay: $0 fees (only network fees)

---

## ✅ Complete Checklist

### Phase 1: LunaNode Setup
- [ ] Create LunaNode account
- [ ] Add $20 credit
- [ ] Enable 2FA
- [ ] Deploy BTCPay Server (one-click)
- [ ] Configure DNS (if using custom domain)

### Phase 2: BTCPay Configuration
- [ ] Wait for blockchain sync (2-4 hours)
- [ ] Create admin account
- [ ] Enable 2FA
- [ ] Create store "CaribPredict"
- [ ] Generate Bitcoin wallet
- [ ] Save seed phrase offline (CRITICAL!)
- [ ] Enable Lightning Network
- [ ] Fund Lightning channels

### Phase 3: API Setup
- [ ] Generate API key with correct permissions
- [ ] Get Store ID from settings URL
- [ ] Generate webhook secret (32+ characters)
- [ ] Create webhook pointing to CaribPredict
- [ ] Test webhook delivery

### Phase 4: Local Integration
- [ ] Run setup script (`setup-btcpay-env.bat` or `.sh`)
- [ ] Verify credentials in `.env.local`
- [ ] Test locally with `npm run dev`
- [ ] Create test deposit
- [ ] Verify redirect to BTCPay

### Phase 5: Production Deployment
- [ ] Add env vars to Vercel
- [ ] Redeploy application
- [ ] Update webhook URL in BTCPay
- [ ] Test webhook delivery
- [ ] Make test deposit ($5-10)
- [ ] Verify balance updates
- [ ] Make test withdrawal
- [ ] Approve payout in BTCPay
- [ ] Verify withdrawal received

### Phase 6: Security & Monitoring
- [ ] 2FA enabled everywhere
- [ ] Seed phrase backed up offline
- [ ] API keys in Vercel (not in code)
- [ ] Webhook secret is strong (32+ chars)
- [ ] HTTPS enforced
- [ ] Regular backups scheduled
- [ ] Monitoring set up

---

## 🔐 Security Best Practices

### Critical Security Rules

1. **Seed Phrase:**
   - Write down on paper (not digital)
   - Store in safe location (fireproof safe, bank deposit box)
   - NEVER share with anyone
   - NEVER store in cloud/email/photos
   - Anyone with seed phrase can steal your Bitcoin!

2. **API Keys:**
   - Store in Vercel environment variables only
   - NEVER commit to Git
   - Rotate every 90 days
   - Use minimum required permissions

3. **Webhook Secret:**
   - Generate with: `openssl rand -hex 32`
   - Must be 32+ characters
   - Store securely
   - Verify signature on every webhook

4. **Two-Factor Authentication:**
   - Enable on LunaNode account
   - Enable on BTCPay account
   - Enable on Vercel account
   - Save backup codes

5. **HTTPS Only:**
   - Always use HTTPS URLs
   - Never send credentials over HTTP
   - LunaNode provides automatic SSL certificates

### Files to NEVER Commit

These files contain sensitive information and are in `.gitignore`:

```
.env.local                # Your environment variables
.env.local.backup         # Backup of env vars
BTCPAY-CREDENTIALS.txt    # Generated credentials file
```

**Always verify before committing:**
```bash
git status
# Check that sensitive files are not listed
```

---

## 🧪 Testing Checklist

### Before Going Live

Test each feature thoroughly:

**Deposit Flow:**
- [ ] User can click "Deposit" button
- [ ] Redirects to BTCPay checkout
- [ ] Shows Bitcoin on-chain option
- [ ] Shows Lightning Network option (if enabled)
- [ ] QR codes display correctly
- [ ] Payment address is correct
- [ ] After payment, redirects back to CaribPredict
- [ ] Balance updates automatically
- [ ] Transaction appears in Supabase

**Withdrawal Flow:**
- [ ] User can click "Withdraw" button
- [ ] Can enter Bitcoin address
- [ ] Can enter amount
- [ ] Validates Bitcoin address format
- [ ] Checks sufficient balance
- [ ] Creates payout in BTCPay
- [ ] Deducts balance immediately
- [ ] Payout appears in BTCPay dashboard
- [ ] After approval, Bitcoin is sent
- [ ] Transaction updates to "completed"

**Webhook Flow:**
- [ ] Webhook delivers successfully
- [ ] Signature validation passes
- [ ] Invoice settled event updates balance
- [ ] Payout completed event updates transaction
- [ ] Failed deliveries are retried
- [ ] No errors in Vercel logs

**Edge Cases:**
- [ ] Expired invoice doesn't credit balance
- [ ] Invalid webhook signature is rejected
- [ ] Insufficient balance prevents withdrawal
- [ ] Invalid Bitcoin address is rejected
- [ ] Duplicate webhook deliveries are handled

---

## 🐛 Troubleshooting

### Quick Fixes

**Problem:** Can't access BTCPay URL
**Solution:**
- Check VM is running in LunaNode dashboard
- Wait 10 minutes after deployment for services to start
- Verify DNS if using custom domain
- Try IP address directly

**Problem:** Blockchain sync taking too long
**Solution:**
- Should complete in 2-4 hours on m.4 VM
- Check disk space (need 500GB+ free)
- Check logs in LunaNode console
- Contact LunaNode support if stuck >6 hours

**Problem:** Webhook not firing
**Solution:**
- Check webhook URL is correct
- Verify webhook secret matches
- Test webhook in BTCPay dashboard
- Check Vercel function logs
- Ensure app is deployed (not localhost)

**Problem:** Balance not updating
**Solution:**
- Check BTCPay webhook deliveries
- Check Vercel function logs
- Check Supabase transactions table
- Manually trigger webhook redelivery

**Problem:** API authentication fails
**Solution:**
- Verify API key is correct
- Check Store ID is correct
- Verify API key permissions
- Regenerate API key if needed

### Getting Help

**BTCPay Support:**
- Documentation: https://docs.btcpayserver.org/
- Community Chat: https://chat.btcpayserver.org/
- GitHub Issues: https://github.com/btcpayserver/btcpayserver/issues

**LunaNode Support:**
- Support Tickets: https://www.lunanode.com/panel/support
- Status Page: https://status.lunanode.com/

**Vercel Support:**
- Documentation: https://vercel.com/docs
- Support: https://vercel.com/support

---

## 📊 Monitoring & Maintenance

### Daily Checks (5 minutes)

**BTCPay Dashboard:**
- Check for pending payouts
- Review webhook delivery success rate (should be >99%)
- Check server disk space (should be >20% free)

**Vercel Logs:**
- Check for errors or 500 responses
- Verify webhook deliveries
- Check API response times (<500ms)

**Supabase:**
- Check for stuck "pending" transactions
- Verify balance updates are working

### Weekly Tasks (15 minutes)

1. Test small deposit ($1-5)
2. Test small withdrawal (0.0001 BTC)
3. Review webhook delivery logs
4. Check for BTCPay updates
5. Verify Lightning channel capacity

### Monthly Tasks (30 minutes)

1. Rotate API keys (good practice)
2. Download database backup
3. Verify seed phrase backup location
4. Review transaction history for anomalies
5. Check LunaNode billing
6. Update BTCPay if new version available

---

## 🎯 Success Metrics

After deployment, you should see:

**Performance:**
- Webhook delivery success rate: >99%
- API response time: <500ms
- Uptime: >99.9%
- Zero balance discrepancies

**User Experience:**
- Deposit confirmation: <2 seconds (Lightning) or <10 minutes (on-chain)
- Withdrawal processing: <1 hour (with manual approval)
- Zero failed payments due to server errors

**Security:**
- No unauthorized access attempts
- All credentials rotated regularly
- 2FA enabled everywhere
- Seed phrase safely stored offline

---

## 🚀 You're Ready!

Everything you need to deploy BTCPay Server is in this folder. Follow the guides in order:

1. **[LUNANODE-BTCPAY-DEPLOYMENT.md](./LUNANODE-BTCPAY-DEPLOYMENT.md)** - Deploy BTCPay Server
2. Run **`setup-btcpay-env.bat`** or **`setup-btcpay-env.sh`** - Configure locally
3. **[DEPLOY-BTCPAY-TO-VERCEL.md](./DEPLOY-BTCPAY-TO-VERCEL.md)** - Deploy to production
4. **[BTCPAY-QUICK-REFERENCE.md](./BTCPAY-QUICK-REFERENCE.md)** - Bookmark for later

**Questions?** Check the troubleshooting sections in each guide.

**Ready to start?** Open [LUNANODE-BTCPAY-DEPLOYMENT.md](./LUNANODE-BTCPAY-DEPLOYMENT.md) and begin!

---

## 💡 Pro Tips

1. **Start Small:** Test with $5-10 deposits first
2. **Use Lightning:** Instant confirmations, <$0.01 fees
3. **Monitor Daily:** Check logs and webhook deliveries
4. **Backup Weekly:** Download database backups regularly
5. **Keep Updated:** BTCPay releases updates regularly
6. **Fund Channels:** Lightning needs inbound capacity for deposits
7. **Set Limits:** Require manual approval for large withdrawals
8. **Test Testnet:** If unsure, deploy on Bitcoin testnet first
9. **Read Logs:** Vercel and BTCPay logs show exactly what's happening
10. **Ask Community:** BTCPay has excellent community support

---

## 📞 Support

Need help? We've got you covered:

**Documentation:**
- This folder contains comprehensive guides
- Each guide has detailed troubleshooting sections
- Quick reference has common fixes

**Community:**
- BTCPay Community Chat: https://chat.btcpayserver.org/
- LunaNode Support: https://www.lunanode.com/panel/support
- Vercel Docs: https://vercel.com/docs

**Logs:**
- BTCPay: Server logs in LunaNode console
- Vercel: Function logs in Vercel dashboard
- Browser: Console logs (F12 → Console)

---

**Last Updated:** February 9, 2026
**Version:** 1.0
**Status:** Production Ready

**Now go deploy BTCPay and start accepting Bitcoin! 🚀⚡💰**
