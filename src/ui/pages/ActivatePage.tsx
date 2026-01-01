import * as React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../core/persistence/supabaseClient";
import { Card } from "../components/Card";
import Button from "../components/Button";

function parseHashParams(hash: string) {
  const clean = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(clean);
  return {
    access_token: params.get("access_token"),
    refresh_token: params.get("refresh_token"),
    type: params.get("type"),
    error: params.get("error"),
    error_description: params.get("error_description"),
  };
}

function stripUrlTokens() {
  window.history.replaceState({}, document.title, window.location.pathname);
}

export default function ActivatePage() {
  const nav = useNavigate();
  const [status, setStatus] = React.useState<"loading" | "error">("loading");
  const [message, setMessage] = React.useState<string>("Activating your account...");

  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const goToApp = () => {
          if (!alive) return;
          nav("/game", { replace: true });
        };

        const fail = (text: string) => {
          if (!alive) return;
          setStatus("error");
          setMessage(text);
        };

        // 1) If Supabase already parsed the URL, session might already exist
        const pre = await supabase.auth.getSession();
        if (pre.data.session) {
          goToApp();
          return;
        }

        // 2) PKCE flow: ?code=...
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          stripUrlTokens();
          if (error) throw error;

          const post = await supabase.auth.getSession();
          if (post.data.session) {
            goToApp();
            return;
          }
        }

        // 3) Implicit flow: #access_token=...&refresh_token=...
        const { access_token, refresh_token, error, error_description } = parseHashParams(
          window.location.hash
        );

        if (error) {
          fail(error_description || "Activation failed.");
          return;
        }

        if (access_token && refresh_token) {
          const { error: setErr } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          stripUrlTokens();

          if (setErr) {
            const post = await supabase.auth.getSession();
            if (post.data.session) {
              goToApp();
              return;
            }
            throw setErr;
          }

          const post = await supabase.auth.getSession();
          if (post.data.session) {
            goToApp();
            return;
          }
        }

        // 4) Last fallback: wait briefly for INITIAL_SESSION
        const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "INITIAL_SESSION" && session) {
            sub.subscription.unsubscribe();
            goToApp();
          }
        });

        setTimeout(async () => {
          const final = await supabase.auth.getSession();
          if (final.data.session) {
            sub.subscription.unsubscribe();
            goToApp();
            return;
          }
          if (alive) {
            fail(
              "Activation failed, but your email may already be confirmed. Try logging in."
            );
          }
          sub.subscription.unsubscribe();
        }, 1200);
      } catch (e: any) {
        if (!alive) return;
        setStatus("error");
        setMessage(e?.message ?? "Activation failed. The link may be expired or already used.");
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Card className="rounded-3xl p-6">
          <div className="text-base font-semibold">
            {status === "loading" ? "Activating..." : "Activation failed"}
          </div>
          <div className="mt-2 text-sm text-[var(--text-muted)]">{message}</div>

          <div className="mt-4 flex gap-2">
            <Button variant="primary" onClick={() => nav("/auth")} className="w-full">
              Go to sign in
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

