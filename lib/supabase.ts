import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to get authenticated user's data
export async function getOrCreateUser() {
  // Get current authenticated user
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    throw new Error('Not authenticated');
  }

  // Check if user record exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (existingUser) {
    return existingUser;
  }

  // User record should have been created during signup
  // If for some reason it doesn't exist, throw error
  throw new Error('User record not found. Please sign up again.');
}
