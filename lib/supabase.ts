import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to get or create a user (for demo purposes)
export async function getOrCreateUser(telegramId?: string) {
  if (!telegramId) {
    telegramId = 'demo_user_' + Math.random().toString(36).substring(7);
  }

  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();

  if (existingUser) {
    return existingUser;
  }

  // Create new user with 10,000 sats
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      telegram_id: telegramId,
      balance_satoshis: 10000,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return newUser;
}
