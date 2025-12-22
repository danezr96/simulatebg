// src/core/services/authService.ts
import { supabase } from "../persistence/supabaseClient";

export type AuthUser = {
  id: string;
  email?: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
  user: AuthUser;
};

function mapSession(session: any): AuthSession {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? undefined,
    user: {
      id: session.user.id,
      email: session.user.email ?? undefined,
    },
  };
}

/**
 * Supabase Auth wrapper used by UI.
 * Note: if you set persistSession=false in supabaseClient,
 * you must manage session yourself (recommended for v0: keep persistSession=true).
 */
export const authService = {
  async getSession(): Promise<AuthSession | null> {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session ? mapSession(data.session) : null;
  },

  async signUpWithEmail(input: { email: string; password: string }): Promise<AuthSession | null> {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
    });
    if (error) throw error;
    return data.session ? mapSession(data.session) : null;
  },

  async signInWithEmail(input: { email: string; password: string }): Promise<AuthSession> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (error) throw error;
    if (!data.session) throw new Error("No session returned from Supabase sign-in.");
    return mapSession(data.session);
  },

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  onAuthStateChange(
    callback: (event: string, session: AuthSession | null) => void
  ): { unsubscribe: () => void } {
    const { data } = supabase.auth.onAuthStateChange((_event, _session) => {
      callback(_event, _session ? mapSession(_session) : null);
    });

    return { unsubscribe: () => data.subscription.unsubscribe() };
  },
};
