import { NextRequest, NextResponse } from 'next/server';
import { btcpayClient } from '@/lib/btcpay';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId, amountSatoshis, bitcoinAddress } = await req.json();

    if (!userId || !amountSatoshis || !bitcoinAddress) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Verify BTCPay is configured
    if (!process.env.BTCPAY_HOST || !process.env.BTCPAY_API_KEY || !process.env.BTCPAY_STORE_ID) {
      return NextResponse.json({ error: 'BTCPay not configured' }, { status: 500 });
    }

    // Get user balance
    const { data: user } = await supabase
      .from('users')
      .select('balance_satoshis')
      .eq('id', userId)
      .single();

    if (!user || user.balance_satoshis < amountSatoshis) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Convert satoshis to BTC
    const amountBTC = amountSatoshis / 100000000;

    // Create payout via BTCPay
    const payout = await btcpayClient.createPayout(
      bitcoinAddress,
      amountBTC,
      userId
    );

    // Deduct balance
    await supabase
      .from('users')
      .update({ balance_satoshis: user.balance_satoshis - amountSatoshis })
      .eq('id', userId);

    // Record transaction
    await supabase.from('transactions').insert({
      user_id: userId,
      type: 'withdrawal',
      amount_satoshis: -amountSatoshis,
      status: 'pending',
      btcpay_invoice_id: payout.id,
      metadata: {
        payout_id: payout.id,
        destination: bitcoinAddress,
        amount_btc: amountBTC,
      },
    });

    return NextResponse.json({
      success: true,
      payoutId: payout.id,
    });
  } catch (error: any) {
    console.error('Withdrawal error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
