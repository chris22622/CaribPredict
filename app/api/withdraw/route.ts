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

    if (amountSatoshis <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
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

    // Step 1: Create payout via BTCPay FIRST
    let payout;
    try {
      payout = await btcpayClient.createPayout(
        bitcoinAddress,
        amountBTC,
        userId
      );
    } catch (payoutError: any) {
      console.error('BTCPay payout creation failed:', payoutError);
      return NextResponse.json(
        { error: 'Failed to create payout. Your balance has not been affected.' },
        { status: 500 }
      );
    }

    // Step 2: Only deduct balance AFTER payout is confirmed created
    const { error: balanceError } = await supabase
      .from('users')
      .update({ balance_satoshis: user.balance_satoshis - amountSatoshis })
      .eq('id', userId);

    if (balanceError) {
      console.error('Balance deduction failed after payout created:', balanceError);
      // Log this for manual resolution - payout was created but balance wasn't deducted
      console.error(`CRITICAL: Payout ${payout.id} created for user ${userId} but balance deduction failed. Manual fix needed.`);
      return NextResponse.json(
        { error: 'Withdrawal processing error. Please contact support.' },
        { status: 500 }
      );
    }

    // Step 3: Record transaction
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
