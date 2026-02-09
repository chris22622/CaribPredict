# BTCPay Server Quick Reference Card

**CaribPredict Bitcoin Payment Integration**

This is your one-page reference for all BTCPay Server endpoints, credentials, and common operations.

---

## 🔑 Credentials Template

Save these securely (password manager or encrypted note):

```
BTCPay Server URL:
  https://btcpay.caribpredict.com

Store ID:
  [Your Store ID from BTCPay]

API Key:
  btcpay_[Your API Key]

Webhook Secret:
  [Your 32+ character secret]

Webhook URL:
  https://www.caribpredict.com/api/webhooks/btcpay
```

---

## 🔗 Important URLs

### BTCPay Server Dashboard
```
https://btcpay.caribpredict.com
```

### Store Settings
```
https://btcpay.caribpredict.com/stores/{STORE_ID}/settings
```

### Webhooks Management
```
https://btcpay.caribpredict.com/stores/{STORE_ID}/webhooks
```

### Invoices
```
https://btcpay.caribpredict.com/invoices
```

### Wallets
```
https://btcpay.caribpredict.com/wallets
```

### Lightning Node Management
```
https://btcpay.caribpredict.com/stores/{STORE_ID}/lightning
```

### API Keys
```
https://btcpay.caribpredict.com/account/apikeys
```

---

## 🛠️ API Endpoints

### Create Invoice (Deposit)

**Endpoint:**
```
POST https://btcpay.caribpredict.com/api/v1/stores/{STORE_ID}/invoices
```

**Headers:**
```
Authorization: token {API_KEY}
Content-Type: application/json
```

**Request Body:**
```json
{
  "amount": "10.00",
  "currency": "USD",
  "metadata": {
    "userId": "user-123",
    "orderId": "deposit_1234567890"
  },
  "checkout": {
    "redirectURL": "https://www.caribpredict.com/profile?deposit=success",
    "speedPolicy": "HighSpeed"
  }
}
```

**Response:**
```json
{
  "id": "invoice_abc123",
  "checkoutLink": "https://btcpay.caribpredict.com/i/abc123",
  "amount": "10.00",
  "currency": "USD",
  "status": "New"
}
```

### Get Invoice

**Endpoint:**
```
GET https://btcpay.caribpredict.com/api/v1/stores/{STORE_ID}/invoices/{INVOICE_ID}
```

**Headers:**
```
Authorization: token {API_KEY}
```

**Response:**
```json
{
  "id": "invoice_abc123",
  "status": "Settled",
  "amount": "10.00",
  "currency": "USD",
  "payment": {
    "value": 0.00025,
    "cryptoCode": "BTC"
  }
}
```

### Create Payout (Withdrawal)

**Endpoint:**
```
POST https://btcpay.caribpredict.com/api/v1/stores/{STORE_ID}/payouts
```

**Headers:**
```
Authorization: token {API_KEY}
Content-Type: application/json
```

**Request Body:**
```json
{
  "destination": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  "amount": "0.001",
  "paymentMethod": "BTC-CHAIN",
  "metadata": {
    "userId": "user-123",
    "withdrawalId": "withdrawal_1234567890"
  }
}
```

**Response:**
```json
{
  "id": "payout_xyz789",
  "destination": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  "amount": "0.001",
  "paymentMethod": "BTC-CHAIN",
  "state": "AwaitingApproval"
}
```

### Get Payout

**Endpoint:**
```
GET https://btcpay.caribpredict.com/api/v1/stores/{STORE_ID}/payouts/{PAYOUT_ID}
```

**Headers:**
```
Authorization: token {API_KEY}
```

**Response:**
```json
{
  "id": "payout_xyz789",
  "state": "Completed",
  "amount": "0.001",
  "paymentMethod": "BTC-CHAIN"
}
```

---

## 🔔 Webhook Events

BTCPay sends these events to: `https://www.caribpredict.com/api/webhooks/btcpay`

### Invoice Settled

**Event Type:** `InvoiceSettled`

**Payload:**
```json
{
  "type": "InvoiceSettled",
  "invoiceId": "invoice_abc123",
  "metadata": {
    "userId": "user-123",
    "orderId": "deposit_1234567890"
  },
  "payment": {
    "value": 0.00025,
    "cryptoCode": "BTC"
  }
}
```

**Action:** Update user balance, mark transaction as completed.

### Invoice Processing

**Event Type:** `InvoiceProcessing`

**Payload:**
```json
{
  "type": "InvoiceProcessing",
  "invoiceId": "invoice_abc123",
  "metadata": { ... },
  "payment": { ... }
}
```

**Action:** Can credit balance early (0-conf), or wait for settlement.

### Payout Approved

**Event Type:** `PayoutApproved`

**Payload:**
```json
{
  "type": "PayoutApproved",
  "payoutId": "payout_xyz789"
}
```

**Action:** Update transaction status to "processing".

### Payout Completed

**Event Type:** `PayoutCompleted`

**Payload:**
```json
{
  "type": "PayoutCompleted",
  "payoutId": "payout_xyz789"
}
```

**Action:** Mark transaction as completed.

---

## 🧪 Test Commands

### Check BTCPay Server Status

```bash
curl https://btcpay.caribpredict.com/api/v1/health
```

### Test API Authentication

```bash
curl -H "Authorization: token YOUR_API_KEY" \
  https://btcpay.caribpredict.com/api/v1/stores/YOUR_STORE_ID
```

### Create Test Invoice

```bash
curl -X POST \
  -H "Authorization: token YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount":"10","currency":"USD"}' \
  https://btcpay.caribpredict.com/api/v1/stores/YOUR_STORE_ID/invoices
```

### Test Webhook Signature

```bash
# Generate signature
echo -n '{"test":"data"}' | openssl dgst -sha256 -hmac "YOUR_WEBHOOK_SECRET"

# Should output: SHA256(stdin)= <signature>
```

### Generate Webhook Secret

```bash
# Mac/Linux
openssl rand -hex 32

# Windows PowerShell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

---

## 📊 CaribPredict Integration

### API Routes

**Deposit:**
```
POST /api/deposit
Body: { userId, amountUSD }
Returns: { checkoutUrl, invoiceId }
```

**Withdraw:**
```
POST /api/withdraw
Body: { userId, amountSatoshis, bitcoinAddress }
Returns: { payoutId }
```

**Webhook:**
```
POST /api/webhooks/btcpay
Headers: btcpay-sig
Body: BTCPay event payload
```

### Environment Variables

```bash
BTCPAY_HOST=https://btcpay.caribpredict.com
BTCPAY_API_KEY=btcpay_Sk...
BTCPAY_STORE_ID=ABC123XYZ
BTCPAY_WEBHOOK_SECRET=a1b2c3d4...
NEXT_PUBLIC_SITE_URL=https://www.caribpredict.com
```

### Supabase Tables

**transactions table:**
```sql
- id (uuid)
- user_id (uuid)
- type (text) -- 'deposit' or 'withdrawal'
- amount_satoshis (bigint)
- status (text) -- 'pending', 'processing', 'completed', 'failed'
- btcpay_invoice_id (text)
- btcpay_payout_id (text)
- created_at (timestamp)
```

---

## 🛡️ Security Checklist

- [ ] API key stored in Vercel env vars (not in code)
- [ ] Webhook secret is 32+ characters
- [ ] Webhook signature verified on every request
- [ ] 2FA enabled on BTCPay account
- [ ] 2FA enabled on LunaNode account
- [ ] Seed phrase backed up offline
- [ ] HTTPS enforced everywhere
- [ ] API key rotated every 90 days
- [ ] Regular backups configured

---

## 🚨 Common Issues & Fixes

### Issue: Invoice creation fails

**Check:**
1. API key has "Create invoice" permission
2. Store ID is correct
3. BTCPay server is running
4. Bitcoin wallet is connected

**Fix:**
```bash
# Test API key
curl -H "Authorization: token YOUR_API_KEY" \
  https://btcpay.caribpredict.com/api/v1/stores/YOUR_STORE_ID
```

### Issue: Webhook not firing

**Check:**
1. Webhook URL is correct and accessible
2. Webhook secret matches in both places
3. CaribPredict is deployed (not localhost)
4. HTTPS is enabled

**Fix:**
- Test webhook in BTCPay dashboard
- Check Vercel function logs
- Verify signature validation logic

### Issue: Balance not updating

**Check:**
1. Webhook delivered successfully (check BTCPay deliveries)
2. Transaction exists in Supabase
3. No errors in Vercel logs
4. User ID matches between invoice and transaction

**Fix:**
- Manually trigger webhook redelivery
- Check Supabase `transactions` table
- Update transaction status manually if needed

### Issue: Payout fails

**Check:**
1. Sufficient balance in BTCPay wallet
2. Bitcoin address is valid (bc1, 1, or 3 prefix)
3. API key has "Create payout" permission
4. Payout approval settings

**Fix:**
```bash
# Verify wallet balance
curl -H "Authorization: token YOUR_API_KEY" \
  https://btcpay.caribpredict.com/api/v1/stores/YOUR_STORE_ID/wallets/BTC
```

---

## 📈 Monitoring

### Daily Checks

**BTCPay Dashboard:**
- Pending payouts: 0
- Webhook success rate: >99%
- Server disk space: >20% free

**Vercel Logs:**
- No 500 errors
- Webhook deliveries successful
- API response times <500ms

**Supabase:**
- No stuck "pending" transactions >1 hour old
- Balance updates working

### Weekly Tasks

1. Test small deposit ($1-5)
2. Test small withdrawal (0.0001 BTC)
3. Review webhook delivery logs
4. Check for BTCPay updates

### Monthly Tasks

1. Rotate API keys
2. Download database backup
3. Verify seed phrase backup location
4. Review transaction history
5. Check LunaNode billing

---

## 🔧 Useful Scripts

### Setup Script

```bash
bash scripts/setup-btcpay-env.sh
```

Interactively configure BTCPay environment variables.

### Test Local Integration

```bash
cd "D:\Bot Projects\CaribPredict"
npm run dev
# Visit http://localhost:3000
# Try creating a deposit
```

### Deploy to Vercel

```bash
cd "D:\Bot Projects\CaribPredict"
git add .
git commit -m "Add BTCPay integration"
git push origin main
# Vercel auto-deploys
```

---

## 📚 Documentation Links

**BTCPay Server:**
- Main Docs: https://docs.btcpayserver.org/
- API Reference: https://docs.btcpayserver.org/API/Greenfield/v1/
- Webhooks: https://docs.btcpayserver.org/Development/GreenFieldExample-NodeJS/

**LunaNode:**
- Dashboard: https://www.lunanode.com/panel/
- Wiki: https://wiki.lunanode.com/
- Support: https://www.lunanode.com/panel/support

**CaribPredict:**
- Deployment Guide: [LUNANODE-BTCPAY-DEPLOYMENT.md](./LUNANODE-BTCPAY-DEPLOYMENT.md)
- Vercel Guide: [DEPLOY-BTCPAY-TO-VERCEL.md](./DEPLOY-BTCPAY-TO-VERCEL.md)
- Setup Guide: [BTCPAY_SETUP.md](./BTCPAY_SETUP.md)

---

## 💡 Pro Tips

1. **Start with Lightning** - Instant confirmations, <$0.01 fees
2. **Enable High Speed** - Accept 0-conf for small amounts (<$100)
3. **Set reasonable expiry** - 60 minutes for invoices (default is 15)
4. **Monitor webhook success** - Should be >99%
5. **Keep BTCPay updated** - Updates appear in dashboard
6. **Backup regularly** - Weekly database + seed phrase
7. **Use testnet first** - If unsure, test on testnet
8. **Set payout limits** - Require manual approval for large withdrawals
9. **Fund Lightning channels** - Need inbound capacity for deposits
10. **Monitor logs** - Check daily for errors or anomalies

---

## 🎯 Quick Start Checklist

Setting up BTCPay for the first time? Follow this order:

1. [ ] Create LunaNode account and add credit
2. [ ] Deploy BTCPay Server (one-click launcher)
3. [ ] Wait for Bitcoin blockchain sync (2-4 hours)
4. [ ] Create BTCPay admin account + enable 2FA
5. [ ] Create store "CaribPredict"
6. [ ] Generate hot wallet (save seed phrase offline!)
7. [ ] Enable Lightning Network (LND)
8. [ ] Open Lightning channel (0.01+ BTC)
9. [ ] Generate API key with correct permissions
10. [ ] Get Store ID from settings URL
11. [ ] Generate webhook secret (32+ characters)
12. [ ] Create webhook pointing to CaribPredict
13. [ ] Run `bash scripts/setup-btcpay-env.sh`
14. [ ] Test locally with `npm run dev`
15. [ ] Add env vars to Vercel
16. [ ] Deploy to production
17. [ ] Test webhook delivery
18. [ ] Make test deposit ($5)
19. [ ] Verify balance updates
20. [ ] Make test withdrawal (0.0001 BTC)
21. [ ] Approve payout in BTCPay
22. [ ] Verify withdrawal received

---

## 🆘 Emergency Contacts

**BTCPay Server Down:**
- Check status: https://btcpay.caribpredict.com
- Restart VM in LunaNode panel
- Check logs: SSH and `docker logs btcpayserver`

**Webhook Failing:**
- Check deliveries in BTCPay dashboard
- Verify URL and secret are correct
- Check Vercel function logs
- Manually redeliver failed webhooks

**Bitcoin Transaction Stuck:**
- Check mempool: https://mempool.space
- May need to RBF (Replace-By-Fee) or CPFP (Child-Pays-For-Parent)
- Wait for next block (usually <10 minutes)

**Lost Access:**
- BTCPay: Use 2FA recovery codes
- LunaNode: Password reset via email
- Seed phrase: Use offline backup to recover wallet

---

**Last Updated:** February 9, 2026
**Version:** 1.0

---

**Keep this document bookmarked for quick reference! 🔖**
