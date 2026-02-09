import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('btcpay-sig');

    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.BTCPAY_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const expectedSig = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');

      if (signature !== `sha256=${expectedSig}`) {
        console.error('Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const event = JSON.parse(body);
    console.log('BTCPay webhook event:', event.type);

    // Handle invoice paid/settled event
    if (event.type === 'InvoiceSettled' || event.type === 'InvoiceProcessing') {
      const invoiceId = event.invoiceId;
      const userId = event.metadata?.userId;

      if (!userId) {
        console.error('No userId in webhook metadata');
        return NextResponse.json({ error: 'No userId' }, { status: 400 });
      }

      // Calculate amount in satoshis
      const amountSatoshis = Math.floor(event.payment.value * 100000000);

      // Update user balance
      const { data: user } = await supabase
        .from('users')
        .select('balance_satoshis')
        .eq('id', userId)
        .single();

      if (user) {
        const newBalance = user.balance_satoshis + amountSatoshis;

        await supabase
          .from('users')
          .update({ balance_satoshis: newBalance })
          .eq('id', userId);

        // Update transaction
        await supabase
          .from('transactions')
          .update({
            amount_satoshis: amountSatoshis,
            status: 'completed'
          })
          .eq('btcpay_invoice_id', invoiceId);

        console.log(`Deposit completed: ${amountSatoshis} sats for user ${userId}`);
      }
    }

    // Handle payout events
    if (event.type === 'PayoutApproved' || event.type === 'PayoutCompleted') {
      const payoutId = event.payoutId;

      await supabase
        .from('transactions')
        .update({ status: 'completed' })
        .eq('btcpay_payout_id', payoutId);

      console.log(`Payout completed: ${payoutId}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
