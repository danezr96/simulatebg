// src/ui/hooks/useCurrentPlayer.ts
import * as React from "react";
import { supabase } from "../../core/persistence/supabaseClient";
import type { Player } from "../../core/domain";
import { playerRepo } from "../../core/persistence/playerRepo";

type State = {
  loading: boolean;
  player: Player | null;
  error: string | null;
};

export function useCurrentPlayer() {
  const [state, setState] = React.useState<State>({
    loading: true,
    player: null,
    error: null,
  });

  const refresh = React.useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;

      const user = data.user;
      if (!user) {
        setState({ loading: false, player: null, error: null });
        return;
      }

      const existing = await playerRepo.getByUserId(user.id);
      setState({ loading: false, player: existing, error: null });
    } catch (e: any) {
      setState({
        loading: false,
        player: null,
        error: e?.message ?? "Failed to load player",
      });
    }
  }, []);

  React.useEffect(() => {
    refresh();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });

    return () => {
      sub?.subscription?.unsubscribe();
    };
  }, [refresh]);

  return {
    ...state,

    // ✅ canonical API
    refresh,

    // ✅ backwards compat for old UI
    ensureBootstrap: refresh,
    refetch: refresh,
    isLoading: state.loading,
  };
}
