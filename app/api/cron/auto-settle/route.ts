// Vercel cron: every minute, find closed unresolved markets that have
// auto_settle_source set and run their oracle. Log each attempt to
// auto_settle_runs.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolveCoinGecko, resolveApiFootball, CoinGeckoConfig, ApiFootballConfig } from '@/lib/oracles';
import { settleMarket, voidMarket } from '@/lib/settlement';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const MAX_ATTEMPTS_BEFORE_VOID = 60;   // ~60 minutes of cron pulls

function isCronRequest(req: NextRequest): boolean {
  if (req.headers.get('x-vercel-cron')) return true;
  const auth = req.headers.get('authorization') || '';
  return !!process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!isCronRequest(req)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const startedAt = Date.now();
  const summary: any[] = [];

  try {
    // Pending = closed, unresolved, has auto_settle_source (non-manual).
    const { data: pending } = await supabase
      .from('markets')
      .select('id, auto_settle_source, auto_settle_config, auto_settle_attempts, close_date')
      .eq('resolved', false)
      .lte('close_date', new Date().toISOString())
      .not('auto_settle_source', 'is', null)
      .neq('auto_settle_source', 'manual')
      .limit(20);

    for (const m of pending || []) {
      const startMs = Date.now();
      let result: any = null;
      let logStatus: 'settled' | 'deferred' | 'failed' | 'voided' = 'failed';
      let errMsg: string | null = null;
      let winningOptionId: string | undefined;
      let winningSide: 'YES' | 'NO' | undefined;

      try {
        if (m.auto_settle_source === 'coingecko') {
          result = await resolveCoinGecko(m.auto_settle_config as CoinGeckoConfig);
        } else if (m.auto_settle_source === 'apifootball') {
          result = await resolveApiFootball(m.auto_settle_config as ApiFootballConfig);
        } else {
          throw new Error(`Unsupported source: ${m.auto_settle_source}`);
        }

        if (result.ok && result.winningOptionId && result.winningSide) {
          const optId: string = result.winningOptionId;
          const side: 'YES' | 'NO' = result.winningSide;
          winningOptionId = optId;
          winningSide = side;
          await settleMarket(supabase, m.id, optId, side);
          logStatus = 'settled';
        } else {
          // Oracle says "not final yet" or "no data". Increment attempts.
          const attempts = (m.auto_settle_attempts || 0) + 1;
          await supabase.from('markets')
            .update({ auto_settle_attempts: attempts, auto_settle_last_error: result?.reason || 'deferred' })
            .eq('id', m.id);
          if (attempts >= MAX_ATTEMPTS_BEFORE_VOID) {
            await voidMarket(supabase, m.id);
            logStatus = 'voided';
            errMsg = `Voided after ${attempts} unresolved oracle pulls`;
          } else {
            logStatus = 'deferred';
          }
        }
      } catch (e: any) {
        errMsg = e?.message || String(e);
        const attempts = (m.auto_settle_attempts || 0) + 1;
        await supabase.from('markets')
          .update({ auto_settle_attempts: attempts, auto_settle_last_error: errMsg })
          .eq('id', m.id);
        if (attempts >= MAX_ATTEMPTS_BEFORE_VOID) {
          try { await voidMarket(supabase, m.id); logStatus = 'voided'; } catch {/*ignore*/}
        }
      }

      await supabase.from('auto_settle_runs').insert({
        market_id: m.id,
        source: m.auto_settle_source,
        status: logStatus,
        oracle_value: result?.raw || null,
        winning_option_id: winningOptionId || null,
        winning_side: winningSide || null,
        error: errMsg,
      });

      summary.push({
        marketId: m.id, source: m.auto_settle_source, status: logStatus,
        durationMs: Date.now() - startMs, reason: result?.reason || errMsg || null,
      });
    }

    return NextResponse.json({
      ok: true,
      processed: summary.length,
      summary,
      durationMs: Date.now() - startedAt,
    });
  } catch (e: any) {
    console.error('[CaribPredict] auto-settle cron error', e);
    return NextResponse.json({ ok: false, error: e?.message || String(e), summary }, { status: 500 });
  }
}
