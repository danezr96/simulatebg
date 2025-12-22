import * as React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../core/persistence/supabaseClient";
import { Card } from "../components/Card";
import Button from "../components/Button";

export default function ActivatePage() {
  const nav = useNavigate();
  const [status, setStatus] = React.useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = React.useState<string>("Activating your account...");

  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // For PKCE email links in SPA:
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error) throw error;

        if (!alive) return;
        setStatus("success");
        setMessage("Your account has been activated. You can sign in now.");
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
            {status === "loading" ? "Activating…" : status === "success" ? "Activated" : "Activation failed"}
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
