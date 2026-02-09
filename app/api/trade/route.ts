import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { calculateBuyCost, calculateSellPayout, MarketState } from '@/lib/amm';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, marketId, optionIndex, tradeType, shares, cost } = body;

    // Validate inputs
    if (!userId || !marketId || optionIndex === undefined || !tradeType || !shares) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (shares <= 0) {
      return NextResponse.json({ error: 'Shares must be positive' }, { status: 400 });
    }

    // Start transaction-like operations
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

    if (market.status !== 'active') {
      return NextResponse.json({ error: 'Market is not active' }, { status: 400 });
    }

    const { data: options, error: optionsError } = await supabase
      .from('market_options')
      .select('*')
      .eq('market_id', marketId)
      .order('option_index', { ascending: true });

    if (optionsError || !options) {
      return NextResponse.json({ error: 'Market options not found' }, { status: 404 });
    }

    // 3. Verify pricing (prevent front-running)
    const marketState: MarketState = {
      shares: options.map((o) => o.current_shares),
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
    if (Math.abs(calculatedCost - cost) > cost * 0.01) {
      return NextResponse.json(
        { error: 'Price changed. Please try again.' },
        { status: 400 }
      );
    }

    // 4. Check user balance for buy orders
    if (tradeType === 'buy') {
      if (user.balance_satoshis < calculatedCost) {
        return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
      }
    }

    // 5. Check user has enough shares for sell orders
    if (tradeType === 'sell') {
      const { data: position } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', userId)
        .eq('market_id', marketId)
        .eq('option_index', optionIndex)
        .single();

      if (!position || position.shares < shares) {
        return NextResponse.json({ error: 'Insufficient shares to sell' }, { status: 400 });
      }
    }

    // 6. Update user balance
    const newBalance =
      tradeType === 'buy'
        ? user.balance_satoshis - calculatedCost
        : user.balance_satoshis + calculatedCost;

    const { error: balanceError } = await supabase
      .from('users')
      .update({ balance_satoshis: newBalance })
      .eq('id', userId);

    if (balanceError) {
      return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 });
    }

    // 7. Update market option shares
    const currentShares = options[optionIndex].current_shares;
    const newShares = tradeType === 'buy' ? currentShares + shares : currentShares - shares;

    const { error: sharesError } = await supabase
      .from('market_options')
      .update({ current_shares: newShares })
      .eq('id', options[optionIndex].id);

    if (sharesError) {
      // Rollback balance
      await supabase
        .from('users')
        .update({ balance_satoshis: user.balance_satoshis })
        .eq('id', userId);
      return NextResponse.json({ error: 'Failed to update shares' }, { status: 500 });
    }

    // 8. Calculate new probabilities for all options
    const newMarketState: MarketState = {
      shares: options.map((o, idx) =>
        idx === optionIndex ? newShares : o.current_shares
      ),
      liquidityParameter: market.liquidity_parameter,
    };

    const sum = newMarketState.shares.reduce(
      (acc, q) => acc + Math.exp(q / newMarketState.liquidityParameter),
      0
    );

    for (let i = 0; i < options.length; i++) {
      const prob = Math.exp(newMarketState.shares[i] / newMarketState.liquidityParameter) / sum;
      await supabase
        .from('market_options')
        .update({ current_probability: prob })
        .eq('id', options[i].id);
    }

    // 9. Update user position
    const { data: existingPosition } = await supabase
      .from('positions')
      .select('*')
      .eq('user_id', userId)
      .eq('market_id', marketId)
      .eq('option_index', optionIndex)
      .single();

    if (existingPosition) {
      const currentPositionShares = existingPosition.shares;
      const newPositionShares =
        tradeType === 'buy' ? currentPositionShares + shares : currentPositionShares - shares;

      // Calculate new average price
      let newAveragePrice = existingPosition.average_price;
      if (tradeType === 'buy') {
        const totalCost =
          currentPositionShares * existingPosition.average_price + calculatedCost;
        newAveragePrice = totalCost / newPositionShares;
      }

      if (newPositionShares > 0) {
        await supabase
          .from('positions')
          .update({
            shares: newPositionShares,
            average_price: newAveragePrice,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingPosition.id);
      } else {
        // Delete position if shares reach 0
        await supabase.from('positions').delete().eq('id', existingPosition.id);
      }
    } else if (tradeType === 'buy') {
      // Create new position
      await supabase.from('positions').insert({
        user_id: userId,
        market_id: marketId,
        option_index: optionIndex,
        shares: shares,
        average_price: calculatedCost / shares,
      });
    }

    // 10. Record trade
    await supabase.from('trades').insert({
      user_id: userId,
      market_id: marketId,
      option_index: optionIndex,
      trade_type: tradeType,
      shares: shares,
      price: calculatedCost / shares,
      cost_satoshis: calculatedCost,
    });

    // 11. Update market volume
    const newVolume = market.total_volume + calculatedCost;
    await supabase
      .from('markets')
      .update({ total_volume: newVolume })
      .eq('id', marketId);

    // 12. Record transaction
    await supabase.from('transactions').insert({
      user_id: userId,
      transaction_type: 'trade',
      amount_satoshis: tradeType === 'buy' ? -calculatedCost : calculatedCost,
      reference_id: marketId,
      status: 'completed',
    });

    return NextResponse.json({
      success: true,
      newBalance,
      message: `Successfully ${tradeType === 'buy' ? 'bought' : 'sold'} ${shares} shares`,
    });
  } catch (error: any) {
    console.error('Trade error:', error);
    return NextResponse.json({ error: error.message || 'Trade failed' }, { status: 500 });
  }
}
