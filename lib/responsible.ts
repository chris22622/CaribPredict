// Helper used by every bet/deposit endpoint to enforce responsible-gambling
// settings: active self-exclusion, cooling-off period, daily caps.

import { SupabaseClient } from '@supabase/supabase-js';

export interface BlockReason {
  blocked: true;
  code: 'self_excluded' | 'cooling_off' | 'daily_wager_cap' | 'daily_deposit_cap' | 'daily_loss_cap';
  message: string;
}
export interface Allowed { blocked: false; }
export type ResponsibleCheck = BlockReason | Allowed;

/** Check if a user is blocked from betting right now. */
export async function checkBetAllowed(
  supabase: SupabaseClient, userId: string, stakeCents: number,
): Promise<ResponsibleCheck> {
  // 1. Active self-exclusion
  const { data: excl } = await supabase
    .from('self_exclusions').select('id, ends_at')
    .eq('user_id', userId).is('released_at', null)
    .order('starts_at', { ascending: false }).limit(1).maybeSingle();
  if (excl) {
    if (!excl.ends_at || new Date(excl.ends_at).getTime() > Date.now()) {
      return {
        blocked: true, code: 'self_excluded',
        message: 'Self-exclusion active. Visit /responsible-gambling for details.',
      };
    }
  }

  // 2. Personal limits
  const { data: lim } = await supabase
    .from('user_responsible_limits').select('*').eq('user_id', userId).maybeSingle();
  if (lim) {
    if (lim.cooling_off_until && new Date(lim.cooling_off_until).getTime() > Date.now()) {
      return {
        blocked: true, code: 'cooling_off',
        message: `Cooling-off period active until ${new Date(lim.cooling_off_until).toLocaleString()}.`,
      };
    }
    if (lim.daily_wager_cap_cents) {
      const wagered = await wageredCentsToday(supabase, userId);
      if (wagered + stakeCents > lim.daily_wager_cap_cents) {
        return {
          blocked: true, code: 'daily_wager_cap',
          message: `Daily wager cap (${(lim.daily_wager_cap_cents / 100).toFixed(2)} USDT) would be exceeded. You've staked ${(wagered / 100).toFixed(2)} so far today.`,
        };
      }
    }
    if (lim.daily_loss_cap_cents) {
      const loss = await netLossCentsToday(supabase, userId);
      if (loss + stakeCents > lim.daily_loss_cap_cents) {
        return {
          blocked: true, code: 'daily_loss_cap',
          message: `Daily loss cap (${(lim.daily_loss_cap_cents / 100).toFixed(2)} USDT) would be exceeded.`,
        };
      }
    }
  }
  return { blocked: false };
}

/** Sum of stakes across all bet sources placed in the last 24h. */
async function wageredCentsToday(supabase: SupabaseClient, userId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const [a, b, c] = await Promise.all([
    supabase.from('bet_orders').select('stake_cents').eq('user_id', userId).gte('created_at', since),
    supabase.from('crash_bets').select('stake_cents').eq('user_id', userId).gte('created_at', since),
    supabase.from('instant_game_bets').select('stake_cents').eq('user_id', userId).gte('created_at', since),
  ]);
  const sum = (rows: any[] | null) => (rows || []).reduce((s, r: any) => s + (r.stake_cents || 0), 0);
  return sum(a.data) + sum(b.data) + sum(c.data);
}

/** Net loss = sum(stake) - sum(payout) for settled bets in last 24h. */
async function netLossCentsToday(supabase: SupabaseClient, userId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const [crash, instant] = await Promise.all([
    supabase.from('crash_bets').select('stake_cents, payout_cents, status').eq('user_id', userId).gte('cashed_at', since),
    supabase.from('instant_game_bets').select('stake_cents, payout_cents, status').eq('user_id', userId).gte('settled_at', since),
  ]);
  const loss = (rows: any[] | null) => (rows || []).reduce((s, r: any) => s + ((r.stake_cents || 0) - (r.payout_cents || 0)), 0);
  return Math.max(0, loss(crash.data) + loss(instant.data));
}

/** Deposit cap check for the deposit poller (sum of deposits since midnight UTC). */
export async function checkDepositAllowed(
  supabase: SupabaseClient, userId: string, additionalCents: number,
): Promise<ResponsibleCheck> {
  const { data: lim } = await supabase
    .from('user_responsible_limits').select('*').eq('user_id', userId).maybeSingle();
  if (!lim) return { blocked: false };
  const sinceDay = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  if (lim.daily_deposit_cap_cents) {
    const { data } = await supabase
      .from('deposits').select('amount_cents').eq('user_id', userId).gte('created_at', sinceDay);
    const used = (data || []).reduce((s, r: any) => s + r.amount_cents, 0);
    if (used + additionalCents > lim.daily_deposit_cap_cents) {
      return {
        blocked: true, code: 'daily_deposit_cap',
        message: `Daily deposit cap exceeded (${(lim.daily_deposit_cap_cents / 100).toFixed(2)} USDT).`,
      };
    }
  }
  return { blocked: false };
}
