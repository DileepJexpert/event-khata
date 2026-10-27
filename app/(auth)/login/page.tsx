"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, LogIn, UserPlus, Ban, Sparkles, Zap, Copy, Check, AlertCircle } from "lucide-react";

const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL || "demo@eventkhata.com";
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD || "demo1234";

function formatAuthError(msg: string): string {
  if (!msg) return "";
  const lower = msg.toLowerCase();
  if (lower.includes("failed to fetch") || lower.includes("networkerror")) {
    return "Unable to connect to the server. Please check your internet connection and try again.";
  }
  return msg;
}

export default function LoginPage() {
  const supabase = createClient();
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("disabled") === "1") {
      setDisabled(true);
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Enter a valid email address");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);

    let data;
    let authError;
    try {
      const result = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });
      data = result.data;
      authError = result.error;
    } catch (err: any) {
      console.error("[Login] Supabase sign-in request failed:", err);
      setError(formatAuthError(err?.message || "Failed to fetch"));
      setLoading(false);
      return;
    }

    if (authError) {
      setError(formatAuthError(authError.message));
      setLoading(false);
      return;
    }

    if (data?.user) {
      const { data: agency } = await supabase
        .from("agencies")
        .select("*")
        .eq("id", data.user.id)
        .maybeSingle();

      if (agency && agency.is_active === false) {
        await supabase.auth.signOut();
        setDisabled(true);
        setError("");
        setLoading(false);
        return;
      }

      window.location.href = agency ? "/dashboard" : "/onboard";
    }
  }

  async function loginAsDemo() {
    setDemoLoading(true);
    setError("");
    setSuccess("Signing in with demo account...");
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });

      if (!signInError && data?.user) {
        const { data: agency } = await supabase
          .from("agencies")
          .select("*")
          .eq("id", data.user.id)
          .maybeSingle();

        if (agency && agency.is_active === false) {
          await supabase.auth.signOut();
          setDisabled(true);
          setError("Demo account has been suspended.");
          setDemoLoading(false);
          return;
        }

        window.location.href = agency ? "/dashboard" : "/onboard";
        return;
      }

      if (signInError) {
        const msg = signInError.message.toLowerCase();
        if (msg.includes("failed to fetch") || msg.includes("networkerror")) {
          setError(formatAuthError(signInError.message));
          setDemoLoading(false);
          return;
        }

        // If user not found, auto-create
        if (msg.includes("invalid") || msg.includes("not found")) {
          setSuccess("Setting up demo user in Supabase...");
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: DEMO_EMAIL,
            password: DEMO_PASSWORD,
          });

          if (signUpData?.user) {
            await supabase.from("agencies").upsert({
              id: signUpData.user.id,
              name: "Demo Wedding Planners",
              owner_name: "Demo Planner",
              owner_email: DEMO_EMAIL,
              subscription_status: "pro",
              currency: "INR",
              is_active: true,
            });

            const { error: retryError } = await supabase.auth.signInWithPassword({
              email: DEMO_EMAIL,
              password: DEMO_PASSWORD,
            });

            if (!retryError) {
              window.location.href = "/dashboard";
              return;
            }
          }

          if (signUpError) {
            setError(formatAuthError(signUpError.message));
            setDemoLoading(false);
            return;
          }
        }

        setError(formatAuthError(signInError.message));
      }
    } catch (err: any) {
      console.error("[Login] Demo login request failed:", err);
      setError(formatAuthError(err?.message || "Failed to fetch"));
    } finally {
      setDemoLoading(false);
    }
  }

  function copyDemoCredentials() {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setCopied(true);
    setSuccess("Credentials filled into the form below!");
    setTimeout(() => setCopied(false), 2500);
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Enter a valid email address");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);

    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email: trimmed,
        password,
      });

      if (signupError) {
        setError(formatAuthError(signupError.message));
        setLoading(false);
        return;
      }

      if (data.user && data.session) {
        window.location.href = "/onboard";
        return;
      }

      if (data.user && !data.session) {
        setSuccess("Check your email for a confirmation link, then come back and login.");
        setMode("login");
        setPassword("");
      }
    } catch (err: any) {
      setError(formatAuthError(err?.message || "Failed to fetch"));
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Enter a valid email address");
      return;
    }
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (resetError) {
        setError(formatAuthError(resetError.message));
      } else {
        setSuccess("Password reset email sent! Check your inbox.");
      }
    } catch (err: any) {
      setError(formatAuthError(err?.message || "Failed to fetch"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-navy-900 px-4 py-6">
      <div className="mb-4 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">EventKhata</h1>
        <p className="mt-1 text-xs text-navy-300 sm:text-sm">Digital Bahi Khata for Event Planners</p>
      </div>

      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:border dark:border-navy-800 dark:bg-navy-900">
        {disabled && (
          <div className="mb-3 flex items-start gap-2.5 rounded-lg bg-red-50 p-2.5 dark:bg-red-950/40">
            <Ban className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-xs font-semibold text-red-700 dark:text-red-300">Account disabled</p>
              <p className="text-[11px] text-red-600 dark:text-red-400">
                Your access has been suspended. Please contact support.
              </p>
            </div>
          </div>
        )}

        {/* Pinned Demo User Card */}
        {mode === "login" && (
          <div className="mb-4 rounded-xl border border-emerald-300 bg-gradient-to-br from-emerald-50 via-teal-50/60 to-emerald-100/40 p-3.5 shadow-xs dark:border-emerald-800 dark:from-emerald-950/50 dark:via-navy-900 dark:to-teal-950/40">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Demo Account (Pinned)
              </span>
              <span className="rounded-full bg-emerald-200/80 px-2 py-0.5 text-[10px] font-bold text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200">
                Instant Access
              </span>
            </div>

            <div className="mt-2 rounded-lg bg-white/90 p-2 text-xs backdrop-blur-xs dark:bg-navy-950/70">
              <div className="flex items-center justify-between py-0.5">
                <span className="text-navy-500 dark:text-navy-400">Email:</span>
                <span className="font-mono font-semibold text-navy-900 dark:text-navy-100">{DEMO_EMAIL}</span>
              </div>
              <div className="flex items-center justify-between py-0.5">
                <span className="text-navy-500 dark:text-navy-400">Password:</span>
                <span className="font-mono font-semibold text-navy-900 dark:text-navy-100">{DEMO_PASSWORD}</span>
              </div>
            </div>

            <div className="mt-2.5 flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={loginAsDemo}
                disabled={loading || demoLoading}
                className="flex-1 bg-emerald-600 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-98 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                {demoLoading ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Zap className="mr-1.5 h-3.5 w-3.5 fill-current" />
                )}
                1-Click Demo Login
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={copyDemoCredentials}
                title="Fill credentials into form below"
                className="border-emerald-300 bg-white px-2.5 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-navy-900 dark:text-emerald-300"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        )}

        {/* Divider */}
        {mode === "login" && (
          <div className="relative mb-3 flex items-center justify-center">
            <div className="w-full border-t border-navy-100 dark:border-navy-800" />
            <span className="bg-white px-2.5 text-[10px] font-medium uppercase tracking-wider text-navy-400 dark:bg-navy-900 dark:text-navy-500">
              or enter custom credentials
            </span>
            <div className="w-full border-t border-navy-100 dark:border-navy-800" />
          </div>
        )}

        <form onSubmit={mode === "login" ? handleLogin : mode === "signup" ? handleSignup : handleReset} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 pl-9 text-sm"
              />
            </div>
          </div>

          {mode !== "reset" && (
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Password</Label>
              <Input
                type="password"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              <div className="flex items-start gap-1.5">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-600 dark:text-red-400" />
                <span className="leading-tight">{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
              {success}
            </div>
          )}

          <Button type="submit" className="w-full" size="default" disabled={loading || demoLoading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {mode === "login" ? "Login" : mode === "signup" ? "Create Account" : "Send Reset Link"}
          </Button>

          <div className="space-y-1 pt-1 text-center">
            {mode === "login" && (
              <>
                <button
                  type="button"
                  onClick={() => { setMode("reset"); setError(""); setSuccess(""); }}
                  className="block w-full text-[11px] text-navy-400 hover:text-navy-600 dark:text-navy-500 dark:hover:text-navy-300"
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("signup"); setError(""); setSuccess(""); }}
                  className="text-xs text-navy-500 hover:text-navy-700 dark:text-navy-400 dark:hover:text-navy-200"
                >
                  Don&apos;t have an account? <span className="font-semibold text-navy-900 dark:text-navy-100">Sign up</span>
                </button>
              </>
            )}
            {mode === "signup" && (
              <button
                type="button"
                onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
                className="text-xs text-navy-500 hover:text-navy-700 dark:text-navy-400 dark:hover:text-navy-200"
              >
                Already have an account? <span className="font-semibold text-navy-900 dark:text-navy-100">Login</span>
              </button>
            )}
            {mode === "reset" && (
              <button
                type="button"
                onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
                className="text-xs text-navy-500 hover:text-navy-700 dark:text-navy-400 dark:hover:text-navy-200"
              >
                Back to <span className="font-semibold text-navy-900 dark:text-navy-100">Login</span>
              </button>
            )}
          </div>
        </form>
      </div>

      <p className="mt-4 text-[11px] text-navy-400">
        By continuing, you agree to our{" "}
        <a href="/terms" className="underline hover:text-navy-300">Terms of Service</a>
        {" & "}
        <a href="/privacy" className="underline hover:text-navy-300">Privacy Policy</a>
      </p>
    </div>
  );
}
