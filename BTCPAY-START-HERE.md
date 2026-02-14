# 🚀 BTCPay Server Deployment - START HERE

**Mission:** Add Bitcoin payments to CaribPredict using BTCPay Server on LunaNode.

**Status:** Ready to Deploy
**Time Required:** 1-2 hours (mostly automated)
**Cost:** $10/month
**Difficulty:** Beginner-Friendly (No coding required!)

---

## 📖 What Is This?

This project integrates **BTCPay Server** (open-source Bitcoin payment processor) with your **CaribPredict** prediction market platform.

**What you'll get:**
- ✅ Self-hosted Bitcoin payment processing (no middleman fees!)
- ✅ On-chain Bitcoin deposits (secure, decentralized)
- ✅ Lightning Network deposits (instant, nearly free)
- ✅ Automated withdrawals to user Bitcoin addresses
- ✅ Complete control over your payment infrastructure
- ✅ No KYC, no third-party processors, no restrictions

**What it costs:**
- **$10/month** for LunaNode server hosting
- **$0 processing fees** (only Bitcoin network fees: ~$1-5 on-chain, <$0.01 Lightning)
- **Compare to Stripe:** 2.9% + $0.30 per transaction = hundreds saved per month!

---

## 🎯 Quick Start (Choose Your Path)

### Path A: Complete Beginner (Recommended)

**Never deployed a server before? Start here!**

1. **Read the main guide (45-60 minutes):**
   - Open: **[docs/LUNANODE-BTCPAY-DEPLOYMENT.md](./docs/LUNANODE-BTCPAY-DEPLOYMENT.md)**
   - Follow every step from Phase 1 to Phase 9
   - This guide assumes ZERO technical knowledge

2. **Run the setup script (5 minutes):**
   ```cmd
   SETUP-BTCPAY.bat
   ```
   - This will configure your local environment
   - Tests your BTCPay connection
   - Updates `.env.local` automatically

3. **Deploy to production (10 minutes):**
   - Open: **[docs/DEPLOY-BTCPAY-TO-VERCEL.md](./docs/DEPLOY-BTCPAY-TO-VERCEL.md)**
   - Add credentials to Vercel
   - Redeploy your app
   - Test Bitcoin deposits/withdrawals

4. **Bookmark the reference (ongoing):**
   - Open: **[docs/BTCPAY-QUICK-REFERENCE.md](./docs/BTCPAY-QUICK-REFERENCE.md)**
   - Keep this handy for credentials, commands, troubleshooting

**Total time:** 1-2 hours (mostly waiting for Bitcoin blockchain to sync)

### Path B: Experienced User

**Already know servers/Docker/Bitcoin? Go fast!**

1. Deploy BTCPay on LunaNode (one-click installer)
2. Configure Bitcoin wallet + Lightning Network
3. Generate API key and Store ID
4. Run: `scripts\setup-btcpay-env.bat`
5. Add env vars to Vercel and redeploy
6. Test deposits/withdrawals
7. Done!

**Total time:** 20-30 minutes + blockchain sync

---

## 📁 What's In This Folder?

### 🎬 Getting Started

**SETUP-BTCPAY.bat** (Windows) or **setup-btcpay-env.sh** (Mac/Linux)
- Interactive setup script
- Configures environment variables
- Tests BTCPay connection
- **START BY RUNNING THIS**

### 📚 Documentation

**[docs/BTCPAY-DEPLOYMENT-README.md](./docs/BTCPAY-DEPLOYMENT-README.md)** - Overview of all guides

**[docs/LUNANODE-BTCPAY-DEPLOYMENT.md](./docs/LUNANODE-BTCPAY-DEPLOYMENT.md)** ⭐ MAIN GUIDE
- Complete step-by-step deployment
- Beginner-friendly with screenshots in mind
- Covers everything from account creation to testing

**[docs/DEPLOY-BTCPAY-TO-VERCEL.md](./docs/DEPLOY-BTCPAY-TO-VERCEL.md)** - Production deployment
- Add env vars to Vercel
- Deploy and test
- Troubleshooting

**[docs/BTCPAY-QUICK-REFERENCE.md](./docs/BTCPAY-QUICK-REFERENCE.md)** 🔖 BOOKMARK THIS
- One-page reference
- All credentials, endpoints, commands
- Common issues and fixes

**[docs/BTCPAY_SETUP.md](./docs/BTCPAY_SETUP.md)** - General BTCPay guide
- Alternative to LunaNode-specific guide
- Covers various hosting options

### 🛠️ Scripts

**scripts/setup-btcpay-env.bat** (Windows)
- Interactive credential setup
- Connection testing
- Environment file generation

**scripts/setup-btcpay-env.sh** (Mac/Linux)
- Same as .bat but for Unix systems
- Requires bash, curl, and optionally jq

---

## ✅ Prerequisites

Before you start, make sure you have:

- [ ] **LunaNode Account** (create at https://www.lunanode.com/)
- [ ] **$20 USD** for initial credit (Bitcoin, credit card, or PayPal)
- [ ] **Domain Name** (optional but recommended: e.g., btcpay.caribpredict.com)
- [ ] **Vercel Account** (where CaribPredict is deployed)
- [ ] **2-3 Hours** (mostly waiting for blockchain sync)

**Don't have these yet?** No problem! The main guide walks you through getting everything.

---

## 🗺️ The Complete Process (High Level)

### Phase 1: Deploy BTCPay Server (30 minutes)

1. Create LunaNode account
2. Add credit ($20)
3. Use one-click BTCPay installer
4. Configure DNS (if using custom domain)
5. Wait for blockchain sync (2-4 hours)

**Result:** Working BTCPay Server at https://btcpay.caribpredict.com

### Phase 2: Configure BTCPay (15 minutes)

1. Create admin account + enable 2FA
2. Create store "CaribPredict"
3. Generate Bitcoin wallet (save seed phrase!)
4. Enable Lightning Network
5. Fund Lightning channels

**Result:** BTCPay ready to accept payments

### Phase 3: Generate Credentials (10 minutes)

1. Generate API key with correct permissions
2. Get Store ID from settings URL
3. Generate strong webhook secret
4. Create webhook pointing to CaribPredict
5. Test webhook delivery

**Result:** API credentials ready for integration

### Phase 4: Local Testing (10 minutes)

1. Run `SETUP-BTCPAY.bat`
2. Enter your credentials
3. Script tests connection
4. Updates `.env.local`
5. Test with `npm run dev`

**Result:** CaribPredict working locally with BTCPay

### Phase 5: Production Deployment (10 minutes)

1. Add env vars to Vercel
2. Redeploy application
3. Update webhook URL in BTCPay
4. Test deposit flow
5. Test withdrawal flow

**Result:** CaribPredict live with Bitcoin payments! 🎉

---

## 💰 Why BTCPay Server?

### Vs. Traditional Payment Processors

**Stripe/PayPal:**
- ❌ 2.9% + $0.30 per transaction
- ❌ Account freezes/bans
- ❌ Chargebacks
- ❌ KYC requirements
- ❌ Geographic restrictions

**BTCPay Server:**
- ✅ $0 processing fees
- ✅ No middleman (you own the server)
- ✅ No chargebacks (Bitcoin is final)
- ✅ No KYC (privacy-friendly)
- ✅ Works anywhere in the world
- ✅ Open source (full control)

### Vs. Hosted Bitcoin Solutions (Coinbase Commerce, BitPay)

**Coinbase Commerce/BitPay:**
- ❌ 1% fee per transaction
- ❌ Must trust third party
- ❌ Can ban your account
- ❌ Limited customization
- ❌ May require KYC

**BTCPay Server:**
- ✅ $0 fees (just network fees)
- ✅ Fully self-hosted
- ✅ Cannot be banned
- ✅ Fully customizable
- ✅ No KYC required
- ✅ Complete privacy

---

## 🔐 Security First

BTCPay Server is designed with security as top priority. Here's what we do:

**Encryption:**
- ✅ Automatic HTTPS via Let's Encrypt
- ✅ Webhook signature verification
- ✅ API key authentication
- ✅ All credentials in environment variables (not code)

**Access Control:**
- ✅ Two-factor authentication (2FA) required
- ✅ API keys with limited permissions
- ✅ Separate development/production environments
- ✅ Regular credential rotation

**Bitcoin Security:**
- ✅ HD wallet with seed phrase backup
- ✅ Watch-only wallet option
- ✅ Hardware wallet support
- ✅ Manual withdrawal approval (optional)

**Server Security:**
- ✅ Firewall configured by LunaNode
- ✅ Regular updates available
- ✅ Isolated Docker containers
- ✅ Bitcoin Core full node validation

---

## 🧪 Testing Strategy

We test at every level:

**Local Testing:**
```cmd
npm run dev
# Test deposit/withdrawal flows
# Verify redirects and balance updates
```

**API Testing:**
```bash
# Test BTCPay connection
curl -H "Authorization: token YOUR_API_KEY" \
  https://btcpay.caribpredict.com/api/v1/stores/YOUR_STORE_ID
```

**Webhook Testing:**
- Test in BTCPay dashboard
- Verify signature validation
- Check Vercel function logs
- Manual redelivery testing

**End-to-End Testing:**
- Small deposit ($5)
- Verify balance update
- Small withdrawal (0.0001 BTC)
- Approve in BTCPay
- Verify receipt

---

## 📊 Monitoring & Maintenance

After deployment, maintain your system:

**Daily (5 minutes):**
- Check BTCPay dashboard
- Review webhook deliveries
- Check for pending payouts
- Monitor disk space

**Weekly (15 minutes):**
- Test deposit flow
- Test withdrawal flow
- Review transaction logs
- Check for BTCPay updates

**Monthly (30 minutes):**
- Rotate API keys
- Download backups
- Review security
- Update BTCPay version

---

## 🐛 Troubleshooting

Every guide includes detailed troubleshooting sections:

**Common Issues:**
- BTCPay URL unreachable → Check VM status
- Blockchain sync stuck → Check disk space
- Webhook not firing → Verify URL and secret
- Balance not updating → Check webhook deliveries
- API auth fails → Verify API key and permissions

**Where to Get Help:**
- Troubleshooting sections in each guide
- Quick Reference has common fixes
- BTCPay Community: https://chat.btcpayserver.org/
- LunaNode Support: https://www.lunanode.com/panel/support

---

## 💡 Pro Tips

1. **Use Lightning Network** - Instant deposits, <$0.01 fees
2. **Start with Testnet** - Practice on Bitcoin testnet first if nervous
3. **Enable 0-conf** - Accept unconfirmed transactions for small amounts (<$100)
4. **Set Invoice Expiry** - 60 minutes gives users time to pay
5. **Fund Lightning Channels** - Need inbound capacity for deposits
6. **Manual Approval** - Require approval for withdrawals >$1000
7. **Monitor Daily** - Catch issues early
8. **Backup Weekly** - Download database backups
9. **Update Regularly** - BTCPay releases security updates
10. **Read Logs** - Everything is logged, check them!

---

## 📈 Success Metrics

After deployment, you should achieve:

**Performance:**
- Deposit confirmation: <2 seconds (Lightning) or <10 minutes (on-chain)
- Withdrawal processing: <1 hour
- Uptime: >99.9%
- Webhook success rate: >99%

**Cost Savings:**
- Processing fees: $0 (vs 2.9% on Stripe)
- Monthly: $10 (vs $0 but saves on fees)
- **Breakeven:** ~$350 in monthly deposits

**User Experience:**
- No signup friction (no KYC)
- Instant withdrawals (with Lightning)
- Privacy-friendly
- Global accessibility

---

## 🎓 Learning Resources

**BTCPay Server:**
- Official Docs: https://docs.btcpayserver.org/
- YouTube Channel: https://www.youtube.com/c/BTCPayServer
- Community Chat: https://chat.btcpayserver.org/

**Bitcoin & Lightning:**
- Bitcoin Explained: https://bitcoin.org/en/how-it-works
- Lightning Network: https://lightning.network/
- Mastering Bitcoin: https://github.com/bitcoinbook/bitcoinbook

**LunaNode:**
- LunaNode Wiki: https://wiki.lunanode.com/
- BTCPay on LunaNode: https://wiki.lunanode.com/btcpay

---

## ✨ What's Next?

Once BTCPay is deployed:

1. **Test Thoroughly** - Small amounts first, then increase
2. **Monitor** - Check daily for first week
3. **Announce** - Tell your users Bitcoin payments are live!
4. **Market** - Advertise "Pay with Bitcoin" and "No fees"
5. **Optimize** - Tune invoice expiry, enable 0-conf, etc.
6. **Scale** - Add more Lightning capacity as deposits grow
7. **Expand** - Consider adding LNURL, Lightning addresses, etc.

---

## 🚀 Ready to Start?

You have everything you need! Here's your action plan:

### Right Now (5 minutes):
1. Read this document ✅ (you're here!)
2. Open **[docs/LUNANODE-BTCPAY-DEPLOYMENT.md](./docs/LUNANODE-BTCPAY-DEPLOYMENT.md)**
3. Bookmark **[docs/BTCPAY-QUICK-REFERENCE.md](./docs/BTCPAY-QUICK-REFERENCE.md)**

### Today (1-2 hours):
1. Follow the deployment guide Phase 1-9
2. Run `SETUP-BTCPAY.bat`
3. Deploy to Vercel
4. Test with small amounts

### This Week:
1. Monitor for 24-48 hours
2. Test all features thoroughly
3. Gradually increase limits
4. Announce to users

### This Month:
1. Review analytics
2. Optimize based on usage
3. Add more Lightning capacity
4. Calculate cost savings vs Stripe

---

## 📞 Need Help?

**Stuck? Here's how to get help:**

1. **Check Documentation:**
   - Each guide has detailed troubleshooting
   - Quick Reference has common fixes
   - Error messages usually point to the issue

2. **Check Logs:**
   - Vercel function logs (Vercel dashboard)
   - BTCPay webhook deliveries (BTCPay dashboard)
   - Browser console (F12 → Console)

3. **Test Components:**
   - Is BTCPay server running?
   - Can you access the admin dashboard?
   - Does the test webhook deliver?
   - Are env vars set in Vercel?

4. **Ask Community:**
   - BTCPay Chat: https://chat.btcpayserver.org/
   - Very friendly and helpful community
   - Usually get answers within minutes

---

## 🎉 Let's Do This!

You're about to:
- Deploy your own Bitcoin payment infrastructure
- Save hundreds on payment processing fees
- Gain complete control over your payments
- Offer privacy-friendly Bitcoin payments
- Join the open-source Bitcoin economy

**Ready?** Open **[docs/LUNANODE-BTCPAY-DEPLOYMENT.md](./docs/LUNANODE-BTCPAY-DEPLOYMENT.md)** and let's get started!

---

**Last Updated:** February 9, 2026
**Version:** 1.0
**Status:** Production Ready
**Maintainer:** CaribPredict Team

**Questions?** Open the deployment guide and start reading. Everything is explained step-by-step!

**Let's make that money with Bitcoin! 🚀💰⚡**
