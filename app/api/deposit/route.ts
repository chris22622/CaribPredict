import { NextRequest, NextResponse } from 'next/server';
import { btcpayClient } from '@/lib/btcpay';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId, amountUSD } = await req.json();

    if (!userId || !amountUSD || amountUSD <= 0) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Verify BTCPay is configured
    if (!process.env.BTCPAY_HOST || !process.env.BTCPAY_API_KEY || !process.env.BTCPAY_STORE_ID) {
      return NextResponse.json({ error: 'BTCPay not configured' }, { status: 500 });
    }

    // Create BTCPay invoice
    const invoice = await btcpayClient.createInvoice(amountUSD, userId, {
      type: 'deposit'
    });

    // Store pending transaction
    await supabase.from('transactions').insert({
      user_id: userId,
      type: 'deposit',
      amount_satoshis: 0, // Will update when paid
      status: 'pending',
      btcpay_invoice_id: invoice.id,
      created_at: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: invoice.checkoutLink,
      invoiceId: invoice.id
    });
  } catch (error: any) {
    console.error('Deposit error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
