import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  supabase, 
  isSupabaseConfigured, 
  signInWithEmail, 
  signUpWithEmail, 
  signOutUser, 
  getActiveSession 
} from '../supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGuestMode, setIsGuestMode] = useState(() => {
    return localStorage.getItem('expensepilot_guest_mode') === 'true';
  });

  useEffect(() => {
    let subscription = null;

    async function initAuth() {
      try {
        const initialSession = await getActiveSession();
        if (initialSession?.user) {
          setUser(initialSession.user);
          setSession(initialSession);
          setIsGuestMode(false);
        } else if (isGuestMode) {
          // Keep guest user
          setUser({
            id: 'guest_user',
            email: 'guest@expensepilot.local',
            user_metadata: { full_name: 'Guest Explorer' },
            is_guest: true
          });
        }
      } catch (err) {
        console.error('[AuthContext] Init error:', err);
      } finally {
        setLoading(false);
      }

      // If Supabase is configured, listen to real-time auth state changes
      if (isSupabaseConfigured && supabase) {
        const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
          if (newSession?.user) {
            setUser(newSession.user);
            setSession(newSession);
            setIsGuestMode(false);
            localStorage.removeItem('expensepilot_guest_mode');
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setSession(null);
          }
        });
        subscription = data?.subscription;
      }
    }

    initAuth();

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [isGuestMode]);

  const handleSignIn = async (email, password) => {
    const res = await signInWithEmail(email, password);
    if (res.data?.user) {
      setUser(res.data.user);
      setSession(res.data.session);
      setIsGuestMode(false);
      localStorage.removeItem('expensepilot_guest_mode');
    }
    return res;
  };

  const handleSignUp = async (email, password, metadata) => {
    const res = await signUpWithEmail(email, password, metadata);
    if (res.data?.user) {
      setUser(res.data.user);
      setSession(res.data.session);
      setIsGuestMode(false);
      localStorage.removeItem('expensepilot_guest_mode');
    }
    return res;
  };

  const handleSignOut = async () => {
    await signOutUser();
    setUser(null);
    setSession(null);
    setIsGuestMode(false);
    localStorage.removeItem('expensepilot_guest_mode');
    localStorage.removeItem('expensepilot_demo_session');
  };

  const continueAsGuest = () => {
    setIsGuestMode(true);
    localStorage.setItem('expensepilot_guest_mode', 'true');
    setUser({
      id: 'guest_user',
      email: 'guest@expensepilot.local',
      user_metadata: { full_name: 'Guest Explorer' },
      is_guest: true
    });
  };

  const value = {
    user,
    session,
    loading,
    isGuestMode,
    isSupabaseConfigured,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    continueAsGuest,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

