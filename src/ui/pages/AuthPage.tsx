// src/ui/pages/AuthPage.tsx
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Mail, Lock } from "lucide-react";

import { MOTION } from "../../config/motion";
import * as Ui from "../../config/ui";

import { cn } from "../../utils/format";
import Button from "../components/Button";
import { Card } from "../components/Card";

import { useAuth } from "../hooks/useAuth";
import { useCurrentPlayer } from "../hooks/useCurrentPlayer";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Min 6 characters"),
});

type FormValues = z.infer<typeof schema>;

function getBrandName(): string {
  const anyUi: any = Ui as any;
  const cfg = anyUi.UI_CONFIG ?? anyUi.UiConfig ?? anyUi.default ?? null;
  return cfg?.brand?.appName ?? "Simulate";
}

export const AuthPage: React.FC = () => {
  const nav = useNavigate();
  const auth = useAuth();
  const { isAuthenticated, loading } = auth;

  // NOTE: useCurrentPlayer returns refresh()
  const playerHook = useCurrentPlayer() as any;
  const refreshPlayer = playerHook.refresh ?? playerHook.refetch ?? (async () => {});

  const [mode, setMode] = React.useState<"signin" | "signup">("signin");
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  // ✅ If already authenticated, go to /game (gatekeeper flow)
  React.useEffect(() => {
    if (!isAuthenticated) return;
    refreshPlayer()
      .catch(() => {})
      .finally(() => nav("/game", { replace: true }));
  }, [isAuthenticated, refreshPlayer, nav]);

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setInfo(null);

    try {
      if (mode === "signin") {
        await auth.signInWithEmail(values.email, values.password);
        await refreshPlayer();
        nav("/game", { replace: true }); // ✅
        return;
      }

      // signup
      await auth.signUpWithEmail(values.email, values.password);

      // With email confirmation enabled, user won't be authenticated yet.
      // So: show message, do NOT redirect.
      setInfo(
        "Check your email to activate your account. After activating, come back here and sign in."
      );
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    }
  };

  const appName = getBrandName();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <motion.div
        className="w-full max-w-md"
        initial="hidden"
        animate="show"
        variants={MOTION.page.variants}
      >
        {/* Brand header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2">
            <div className="h-10 w-10 rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm flex items-center justify-center">
              <span className="font-semibold text-[color:var(--accent)]">S</span>
            </div>
            <div className="text-left leading-tight">
              <div className="text-lg font-semibold">{appName}</div>
              <div className="text-sm text-[var(--text-muted)]">
                Build your holding. Dominate the week.
              </div>
            </div>
          </div>
        </div>

        <Card className="rounded-3xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-base font-semibold text-[var(--text)]">
                {mode === "signin" ? "Sign in" : "Create account"}
              </div>
              <div className="text-sm text-[var(--text-muted)]">
                {mode === "signin"
                  ? "Continue your empire."
                  : "Start fresh with a new tycoon identity."}
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => {
                setMode((m) => (m === "signin" ? "signup" : "signin"));
                setError(null);
                setInfo(null);
              }}
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </Button>
          </div>

          <form className="mt-5 space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)]">Email</label>
              <div className="mt-1 flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2">
                <Mail className="h-4 w-4 text-[var(--text-muted)]" />
                <input
                  type="email"
                  className={cn(
                    "w-full bg-transparent outline-none text-sm text-[var(--text)]",
                    "placeholder:text-[var(--text-muted)]"
                  )}
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...form.register("email")}
                />
              </div>
              {form.formState.errors.email ? (
                <div className="mt-1 text-xs text-rose-600">
                  {form.formState.errors.email.message}
                </div>
              ) : null}
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-muted)]">Password</label>
              <div className="mt-1 flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2">
                <Lock className="h-4 w-4 text-[var(--text-muted)]" />
                <input
                  type="password"
                  className={cn(
                    "w-full bg-transparent outline-none text-sm text-[var(--text)]",
                    "placeholder:text-[var(--text-muted)]"
                  )}
                  placeholder="••••••••"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  {...form.register("password")}
                />
              </div>
              {form.formState.errors.password ? (
                <div className="mt-1 text-xs text-rose-600">
                  {form.formState.errors.password.message}
                </div>
              ) : null}
            </div>

            {info ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {info}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <Button className="w-full" loading={loading} type="submit">
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>

            <div className="pt-2 text-center text-xs text-[var(--text-muted)]">
              By continuing you agree to behave like a responsible tycoon.
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
};

export default AuthPage;
