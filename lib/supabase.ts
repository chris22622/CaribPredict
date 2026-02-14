import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase instance (uses anon key, respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase instance (uses service role, bypasses RLS)
export function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Helper function to get authenticated user's data
export async function getOrCreateUser() {
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    throw new Error('Not authenticated');
  }

  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (existingUser) {
    return existingUser;
  }

  throw new Error('User record not found. Please sign up again.');
}
