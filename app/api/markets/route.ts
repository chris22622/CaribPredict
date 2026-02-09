import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    const status = searchParams.get('status') || 'active';

    let query = supabase
      .from('markets')
      .select('*, market_options(*)')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (country && country !== 'All CARICOM') {
      query = query.eq('country', country);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ markets: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      question,
      description,
      country,
      category,
      close_date,
      options,
      liquidity_parameter = 100,
    } = body;

    // Validate required fields
    if (!question || !country || !category || !close_date || !options || options.length < 2) {
      return NextResponse.json(
        { error: 'Missing required fields or insufficient options' },
        { status: 400 }
      );
    }

    // Create market
    const { data: market, error: marketError } = await supabase
      .from('markets')
      .insert({
        question,
        description,
        country,
        category,
        close_date,
        status: 'active',
        total_volume: 0,
        liquidity_parameter,
      })
      .select()
      .single();

    if (marketError) {
      return NextResponse.json({ error: marketError.message }, { status: 400 });
    }

    // Create market options
    const optionsToInsert = options.map((optionText: string, index: number) => ({
      market_id: market.id,
      option_text: optionText,
      option_index: index,
      current_shares: 0,
      current_probability: 1 / options.length, // Equal initial probability
    }));

    const { error: optionsError } = await supabase
      .from('market_options')
      .insert(optionsToInsert);

    if (optionsError) {
      // Rollback: delete the market
      await supabase.from('markets').delete().eq('id', market.id);
      return NextResponse.json({ error: optionsError.message }, { status: 400 });
    }

    return NextResponse.json({ market }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
