/**
 * Supabase Client Configuration
 * 
 * SECURITY BEST PRACTICES:
 * 1. Only VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are exposed here in client code.
 * 2. NEVER expose the service-role key or master secret in frontend code.
 * 3. Row Level Security (RLS) is enforced in Supabase Postgres so that users can only access their own records.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project-id') &&
  !supabaseAnonKey.includes('your-anon-key')
);

if (!isSupabaseConfigured) {
  console.warn(
    '[Supabase Auth] ⚠️ Supabase credentials not found in frontend environment variables. ' +
    'Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env. ' +
    'Running in Guest / Demo Fallback Mode.'
  );
}

// Initialize official Supabase client (or dummy fallback client if not yet configured)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Validates email format before sending to server.
 * @param {string} email 
 * @returns {boolean}
 */
export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

/**
 * Validates password complexity (minimum 8 characters).
 * @param {string} password 
 * @returns {{ valid: boolean, message?: string }}
 */
export function validatePassword(password) {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long.' };
  }
  return { valid: true };
}

/**
 * Sign up a new user via Supabase Auth
 * Note: Password is encrypted and salted by Supabase Auth (Argon2 / Bcrypt)
 */
export async function signUpWithEmail(email, password, metadata = {}) {
  const emailValid = validateEmail(email);
  if (!emailValid) {
    throw new Error('Please enter a valid email address.');
  }

  const passCheck = validatePassword(password);
  if (!passCheck.valid) {
    throw new Error(passCheck.message);
  }

  if (!isSupabaseConfigured || !supabase) {
    // Demo simulation fallback
    const mockUser = {
      id: 'demo-user-' + Date.now(),
      email,
      user_metadata: metadata,
      created_at: new Date().toISOString(),
    };
    localStorage.setItem('expensepilot_demo_session', JSON.stringify({ user: mockUser }));
    return { data: { user: mockUser, session: { access_token: 'demo_token' } }, error: null };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });

  if (error) throw error;
  return { data, error: null };
}

/**
 * Sign in existing user via Supabase Auth
 */
export async function signInWithEmail(email, password) {
  const emailValid = validateEmail(email);
  if (!emailValid) {
    throw new Error('Please enter a valid email address.');
  }

  if (!password) {
    throw new Error('Please enter your password.');
  }

  if (!isSupabaseConfigured || !supabase) {
    // Demo simulation fallback
    const mockUser = {
      id: 'demo-user-1',
      email,
      created_at: new Date().toISOString(),
    };
    localStorage.setItem('expensepilot_demo_session', JSON.stringify({ user: mockUser }));
    return { data: { user: mockUser, session: { access_token: 'demo_token' } }, error: null };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return { data, error: null };
}

/**
 * Sign out current user and clear local session state
 */
export async function signOutUser() {
  localStorage.removeItem('expensepilot_demo_session');
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
  return true;
}

/**
 * Retrieves the currently active user session
 */
export async function getActiveSession() {
  if (isSupabaseConfigured && supabase) {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('[Supabase Auth] Session fetch error:', error);
      return null;
    }
    return session;
  }

  // Check demo session
  const stored = localStorage.getItem('expensepilot_demo_session');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (_) {
      return null;
    }
  }
  return null;
}

