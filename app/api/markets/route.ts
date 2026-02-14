import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const country = searchParams.get('country');
    const category = searchParams.get('category');
    const resolved = searchParams.get('resolved');

    let query = supabase
      .from('markets')
      .select('*')
      .order('created_at', { ascending: false });

    if (country && country !== 'All CARICOM') {
      query = query.eq('country_filter', country);
    }
    if (category && category !== 'All') {
      query = query.eq('category', category);
    }
    if (resolved !== null) {
      query = query.eq('resolved', resolved === 'true');
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ markets: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, description, country_filter, category, close_date, options, liquidity_parameter } = body;

    if (!question || !country_filter || !category || !close_date || !options || options.length < 2) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create market
    const { data: market, error: marketError } = await supabase
      .from('markets')
      .insert({
        question,
        description: description || '',
        country_filter,
        category,
        close_date,
        liquidity_parameter: liquidity_parameter || 100,
      })
      .select()
      .single();

    if (marketError) throw marketError;

    // Create options
    const initialProb = 1 / options.length;
    const optionsToInsert = options.map((label: string) => ({
      market_id: market.id,
      label,
      probability: initialProb,
      total_shares: 0,
    }));

    const { error: optionsError } = await supabase
      .from('market_options')
      .insert(optionsToInsert);

    if (optionsError) throw optionsError;

    return NextResponse.json({ success: true, market });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
