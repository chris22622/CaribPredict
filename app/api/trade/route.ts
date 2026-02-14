import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateBuyCost, calculateSellPayout, MarketState, calculateProbability } from '@/lib/amm';

// Use service role for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, marketId, optionId, tradeType, shares, cost } = body;

    if (!userId || !marketId || !optionId || !tradeType || !shares) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (shares <= 0) {
      return NextResponse.json({ error: 'Shares must be positive' }, { status: 400 });
    }

    // 1. Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. Get market and options
    const { data: market, error: marketError } = await supabase
      .from('markets')
      .select('*')
      .eq('id', marketId)
      .single();

    if (marketError || !market) {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 });
    }

    if (market.resolved) {
      return NextResponse.json({ error: 'Market is already resolved' }, { status: 400 });
    }

    const { data: options, error: optionsError } = await supabase
      .from('market_options')
      .select('*')
      .eq('market_id', marketId)
      .order('created_at', { ascending: true });

    if (optionsError || !options || options.length === 0) {
      return NextResponse.json({ error: 'Market options not found' }, { status: 404 });
    }

    const optionIndex = options.findIndex(opt => opt.id === optionId);
    if (optionIndex === -1) {
      return NextResponse.json({ error: 'Invalid option ID' }, { status: 400 });
    }

    // 3. Verify pricing
    const marketState: MarketState = {
      shares: options.map((o) => o.total_shares),
      liquidityParameter: market.liquidity_parameter,
    };

    let calculatedCost: number;
    if (tradeType === 'buy') {
      const quote = calculateBuyCost(marketState, optionIndex, shares);
      calculatedCost = quote.cost;
    } else {
      const quote = calculateSellPayout(marketState, optionIndex, shares);
      calculatedCost = quote.cost;
    }

    // Allow 1% slippage
    if (Math.abs(calculatedCost - cost) > cost * 0.01 + 1) {
      return NextResponse.json(
        { error: 'Price changed. Please try again.' },
        { status: 400 }
      );
    }

    // 4. Check balance for buys
    if (tradeType === 'buy') {
      if (user.balance_satoshis < calculatedCost) {
        return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
      }
    }

    // 5. Check shares for sells
    if (tradeType === 'sell') {
      const { data: position } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', userId)
        .eq('market_id', marketId)
        .eq('option_id', optionId)
        .single();

      if (!position || position.shares < shares) {
        return NextResponse.json({ error: 'Insufficient shares to sell' }, { status: 400 });
      }
    }

    // 6. Update user balance
    const newBalance = tradeType === 'buy'
      ? user.balance_satoshis - calculatedCost
      : user.balance_satoshis + calculatedCost;

    const { error: balanceError } = await supabase
      .from('users')
      .update({ balance_satoshis: Math.round(newBalance) })
      .eq('id', userId);

    if (balanceError) {
      return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 });
    }

    // 7. Update market option shares
    const currentShares = options[optionIndex].total_shares;
    const newShares = tradeType === 'buy' ? currentShares + shares : Math.max(0, currentShares - shares);

    const { error: sharesError } = await supabase
      .from('market_options')
      .update({ total_shares: newShares })
      .eq('id', optionId);

    if (sharesError) {
      // Rollback balance
      await supabase.from('users').update({ balance_satoshis: user.balance_satoshis }).eq('id', userId);
      return NextResponse.json({ error: 'Failed to update shares' }, { status: 500 });
    }

    // 8. Calculate and update probabilities
    const newMarketShares = options.map((o, idx) => idx === optionIndex ? newShares : o.total_shares);
    const b = market.liquidity_parameter;
    const sum = newMarketShares.reduce((acc, q) => acc + Math.exp(q / b), 0);

    for (let i = 0; i < options.length; i++) {
      const prob = Math.exp(newMarketShares[i] / b) / sum;
      await supabase.from('market_options').update({ probability: prob }).eq('id', options[i].id);
    }

    // 9. Update user position
    const { data: existingPosition } = await supabase
      .from('positions')
      .select('*')
      .eq('user_id', userId)
      .eq('market_id', marketId)
      .eq('option_id', optionId)
      .single();

    if (existingPosition) {
      const newPositionShares = tradeType === 'buy'
        ? existingPosition.shares + shares
        : existingPosition.shares - shares;

      let newAveragePrice = existingPosition.avg_price;
      if (tradeType === 'buy') {
        const totalCost = existingPosition.shares * existingPosition.avg_price + calculatedCost;
        newAveragePrice = newPositionShares > 0 ? totalCost / newPositionShares : 0;
      }

      if (newPositionShares > 0) {
        await supabase.from('positions').update({
          shares: newPositionShares,
          avg_price: newAveragePrice,
          updated_at: new Date().toISOString(),
        }).eq('id', existingPosition.id);
      } else {
        await supabase.from('positions').delete().eq('id', existingPosition.id);
      }
    } else if (tradeType === 'buy') {
      await supabase.from('positions').insert({
        user_id: userId,
        market_id: marketId,
        option_id: optionId,
        shares: shares,
        avg_price: calculatedCost / shares,
      });
    }

    // 10. Record trade
    await supabase.from('trades').insert({
      user_id: userId,
      market_id: marketId,
      option_id: optionId,
      is_buy: tradeType === 'buy',
      shares: shares,
      price: calculatedCost / shares,
      total_cost: Math.round(calculatedCost),
    });

    // 11. Record transaction
    await supabase.from('transactions').insert({
      user_id: userId,
      type: 'trade',
      amount_satoshis: tradeType === 'buy' ? -Math.round(calculatedCost) : Math.round(calculatedCost),
      status: 'confirmed',
      metadata: { market_id: marketId, option_id: optionId, shares, price: calculatedCost / shares },
    });

    return NextResponse.json({
      success: true,
      newBalance: Math.round(newBalance),
      message: `Successfully ${tradeType === 'buy' ? 'bought' : 'sold'} ${shares} shares`,
    });
  } catch (error: any) {
    console.error('Trade error:', error);
    return NextResponse.json({ error: error.message || 'Trade failed' }, { status: 500 });
  }
}
