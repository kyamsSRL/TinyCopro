import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'tinycopro-auth',
    // Bypass Web Locks API to avoid orphaned lock issues on page navigation.
    // Safe for single-tab SPA (static export).
    lock: async (name, acquireTimeout, fn) => fn(),
  },
});
