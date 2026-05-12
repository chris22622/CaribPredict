import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TronEnv, isValidTronAddress } from '@/lib/tron';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const MIN_DEPOSIT_CENTS = 500; // 5 USDT
const MAX_DEPOSIT_CENTS = 50_000_00; // 50,000 USDT per intent

export async function POST(req: NextRequest) {
  try {
    if (!TronEnv.hotWalletAddress || !isValidTronAddress(TronEnv.hotWalletAddress)) {
      return NextResponse.json(
        { error: 'Deposits are temporarily disabled. The platform hot wallet is being set up.' },
        { status: 503 },
      );
    }

    const body = await req.json();
    const { userId, amountUsdt } = body as { userId?: string; amountUsdt?: number };
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
    if (typeof amountUsdt !== 'number' || !isFinite(amountUsdt)) {
      return NextResponse.json({ error: 'amountUsdt must be a number' }, { status: 400 });
    }

    const baseCents = Math.round(amountUsdt * 100);
    if (baseCents < MIN_DEPOSIT_CENTS) {
      return NextResponse.json({ error: 'Minimum deposit is 5 USDT' }, { status: 400 });
    }
    if (baseCents > MAX_DEPOSIT_CENTS) {
      return NextResponse.json({ error: 'Maximum deposit per intent is 50,000 USDT' }, { status: 400 });
    }

    // Verify user exists
    const { data: user } = await supabase
      .from('users').select('id').eq('id', userId).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Pick a unique tag (0-9999) that isn't currently in pending use for the
    // same base amount. We try a few random tags before falling back to scan.
    const tag = await pickUniqueTag(baseCents);
    if (tag == null) {
      return NextResponse.json(
        { error: 'Too many concurrent deposits at this amount, please try a different amount.' },
        { status: 503 },
      );
    }

    const expectedTotalCents = baseCents + tag;
    const { data: intent, error: insErr } = await supabase
      .from('deposit_intents')
      .insert({
        user_id: userId,
        base_amount_cents: baseCents,
        tag,
        expected_total_cents: expectedTotalCents,
        status: 'pending',
      })
      .select()
      .single();
    if (insErr || !intent) {
      return NextResponse.json({ error: insErr?.message || 'Failed to create deposit intent' }, { status: 500 });
    }

    return NextResponse.json({
      address: TronEnv.hotWalletAddress,
      contract: TronEnv.contract,
      network: 'TRC-20 (Tron)',
      sendExactlyUsdt: expectedTotalCents / 100,
      expectedTotalCents,
      tag,
      intentId: intent.id,
      expiresAt: intent.expires_at,
      instructions: [
        `Send exactly ${(expectedTotalCents / 100).toFixed(4)} USDT (TRC-20) to the address above.`,
        'The trailing decimal places are how we identify your deposit.',
        'Confirmation usually credits your balance within 60 seconds of the on-chain confirmation.',
        'This deposit request expires in 24 hours.',
      ],
    });
  } catch (e: any) {
    console.error('[CaribPredict] /api/deposit/address error', e);
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}

async function pickUniqueTag(baseCents: number): Promise<number | null> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const tag = Math.floor(Math.random() * 10000);
    const expected = baseCents + tag;
    const { data } = await supabase
      .from('deposit_intents')
      .select('id')
      .eq('expected_total_cents', expected)
      .eq('status', 'pending')
      .limit(1);
    if (!data || data.length === 0) return tag;
  }
  // Fallback: scan for any unused tag for this base
  const { data: used } = await supabase
    .from('deposit_intents')
    .select('tag')
    .eq('base_amount_cents', baseCents)
    .eq('status', 'pending');
  const taken = new Set((used || []).map((r: any) => r.tag));
  for (let t = 0; t < 10000; t++) if (!taken.has(t)) return t;
  return null;
}
