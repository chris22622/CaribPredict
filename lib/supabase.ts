import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to get or create a user (for demo purposes)
export async function getOrCreateUser(telegramId?: number | string) {
  // Convert to number if string, or generate random demo ID
  let numericId: number;

  if (telegramId) {
    numericId = typeof telegramId === 'number' ? telegramId : parseInt(telegramId);
  } else {
    // Generate random demo user ID (9 digits to match Telegram ID format)
    numericId = 900000000 + Math.floor(Math.random() * 99999999);
  }

  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', numericId)
    .single();

  if (existingUser) {
    return existingUser;
  }

  // Create new user with 10,000 sats
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      telegram_id: numericId,
      username: `user_${numericId}`,
      balance_satoshis: 10000,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return newUser;
}
