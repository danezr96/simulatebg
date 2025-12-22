// src/ui/hooks/useAuth.ts
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../core/persistence/supabaseClient";

export type AuthUser = {
  id: string;
  email?: string;
};

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Initial session
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const session = data.session;
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? undefined,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email ?? undefined,
          });
        } else {
          setUser(null);
        }
      }
    );

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    setLoading(false);
  }, []);

 const signUpWithEmail = useCallback(async (email: string, password: string) => {
  setLoading(true);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/activate`,
    },
  });
  if (error) throw error;
  setLoading(false);
  return data; // { user, session }
}, []);


  const signOut = useCallback(async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setLoading(false);
  }, []);

  return {
    user,
    loading,
    isAuthenticated: !!user,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  };
}
