import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getRecentUsdtTransfersTo, TronEnv } from '@/lib/tron';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Vercel Cron auth: any request with the matching x-vercel-cron header.
function isCronRequest(req: NextRequest): boolean {
  if (req.headers.get('x-vercel-cron')) return true;
  // Allow manual trigger with admin Bearer token for debugging.
  const auth = req.headers.get('authorization') || '';
  if (auth === `Bearer ${process.env.CRON_SECRET}` && process.env.CRON_SECRET) return true;
  return false;
}

export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  if (!isCronRequest(req)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (!TronEnv.hotWalletAddress) {
    return NextResponse.json({ ok: false, reason: 'hot_wallet_not_configured' });
  }

  let transfersSeen = 0;
  let depositsCredited = 0;
  let errorMessage: string | null = null;
  let highWater = 0;

  try {
    // Pull the high-water mark from last run so we only scan new transfers.
    const { data: lastRun } = await supabase
      .from('cron_runs')
      .select('last_block_timestamp')
      .eq('job_name', 'poll-deposits')
      .order('ran_at', { ascending: false })
      .limit(1)
      .single();
    const sinceTs = lastRun?.last_block_timestamp || (Date.now() - 6 * 60 * 60 * 1000);

    const transfers = await getRecentUsdtTransfersTo(TronEnv.hotWalletAddress, sinceTs, 100);
    transfersSeen = transfers.length;

    for (const t of transfers) {
      if (t.blockTimestamp > highWater) highWater = t.blockTimestamp;
      if (!t.confirmed) continue;

      // Already credited? (tx_hash is unique)
      const { data: existing } = await supabase
        .from('deposits').select('id').eq('tx_hash', t.txHash).maybeSingle();
      if (existing) continue;

      // Look up the matching pending intent by expected_total_cents
      const { data: intent } = await supabase
        .from('deposit_intents')
        .select('*')
        .eq('expected_total_cents', t.amountCents)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })  // FIFO if duplicates ever exist
        .limit(1)
        .maybeSingle();

      if (!intent) {
        // Unmatched: log but don't credit. Admin can reconcile later.
        await supabase.from('cron_runs').insert({
          job_name: 'poll-deposits-unmatched',
          transfers_seen: 1,
          error_message: `Unmatched tx ${t.txHash} amount ${t.amountCents}`,
        });
        continue;
      }

      // Mark intent as matched
      await supabase.from('deposit_intents')
        .update({ status: 'matched', tx_hash: t.txHash, matched_at: new Date().toISOString() })
        .eq('id', intent.id);

      // Credit user balance (full amount including the tag becomes their balance)
      const { data: user } = await supabase
        .from('users').select('balance_cents').eq('id', intent.user_id).single();
      if (!user) continue;
      const newBalance = (user.balance_cents || 0) + t.amountCents;
      await supabase.from('users')
        .update({ balance_cents: newBalance })
        .eq('id', intent.user_id);

      // Record deposit ledger entry
      await supabase.from('deposits').insert({
        user_id: intent.user_id,
        intent_id: intent.id,
        tx_hash: t.txHash,
        from_address: t.fromAddress,
        amount_cents: t.amountCents,
        status: 'credited',
      });

      // Set wagering requirement: 5x for first-ever deposit, otherwise additive
      const { data: existingDeposits } = await supabase
        .from('deposits').select('id', { count: 'exact', head: true })
        .eq('user_id', intent.user_id);
      void existingDeposits; // we re-query below
      const { data: prior } = await supabase
        .from('users').select('wagering_required_cents, wagering_completed_cents')
        .eq('id', intent.user_id).single();
      if (prior) {
        const addedRequirement = t.amountCents * 5;
        await supabase.from('users')
          .update({
            wagering_required_cents: (prior.wagering_required_cents || 0) + addedRequirement,
          })
          .eq('id', intent.user_id);
      }

      depositsCredited++;
    }

    if (highWater === 0) highWater = sinceTs;
    await supabase.from('cron_runs').insert({
      job_name: 'poll-deposits',
      last_block_timestamp: highWater,
      transfers_seen: transfersSeen,
      deposits_credited: depositsCredited,
      duration_ms: Date.now() - startedAt,
    });

    // Expire stale pending intents older than expires_at
    await supabase.from('deposit_intents')
      .update({ status: 'expired' })
      .lt('expires_at', new Date().toISOString())
      .eq('status', 'pending');

    return NextResponse.json({ ok: true, transfersSeen, depositsCredited });
  } catch (e: any) {
    errorMessage = e?.message || String(e);
    console.error('[CaribPredict] poll-deposits error', e);
    await supabase.from('cron_runs').insert({
      job_name: 'poll-deposits',
      transfers_seen: transfersSeen,
      deposits_credited: depositsCredited,
      duration_ms: Date.now() - startedAt,
      error_message: errorMessage,
    });
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}
