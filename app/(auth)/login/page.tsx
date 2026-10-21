"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, LogIn, UserPlus, Ban, Sparkles, Zap, Copy, Check } from "lucide-react";

const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL || "demo@eventkhata.com";
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD || "demo1234";

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
    } catch (err) {
      console.error("[Login] Supabase sign-in request failed:", err);
      setError(
        "Cannot reach the login server. Refresh the page and check that Supabase is running locally."
      );
      setLoading(false);
      return;
    }

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data?.user) {
      const { data: agency } = await supabase
        .from("agencies")
        .select("id, is_active")
        .eq("id", data.user.id)
        .maybeSingle();

      // Account disabled by admin → block entry.
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
      // 1. Attempt direct login
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });

      if (!signInError && data?.user) {
        const { data: agency } = await supabase
          .from("agencies")
          .select("id, is_active")
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

      // 2. If user doesn't exist yet, auto-register & initialize demo agency!
      if (
        signInError &&
        (signInError.message.toLowerCase().includes("invalid") ||
          signInError.message.toLowerCase().includes("not found"))
      ) {
        setSuccess("Initializing demo account in Supabase...");
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
        });

        if (signUpData?.user) {
          // Create agency entry if user was created
          await supabase.from("agencies").upsert({
            id: signUpData.user.id,
            name: "Demo Wedding Planners",
            owner_name: "Demo Planner",
            owner_email: DEMO_EMAIL,
            subscription_status: "pro",
            currency: "INR",
            is_active: true,
          });

          // Log in with new credentials
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
          setError(signUpError.message);
          setDemoLoading(false);
          return;
        }
      }

      if (signInError) {
        setError(signInError.message);
      }
    } catch (err) {
      console.error("[Login] Demo login request failed:", err);
      setError(
        "Cannot reach Supabase database. Please check that Supabase is running."
      );
    } finally {
      setDemoLoading(false);
    }
  }

  function copyDemoCredentials() {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setCopied(true);
    setSuccess("Demo credentials filled into form!");
    setTimeout(() => setCopied(false), 2000);
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

    const { data, error: signupError } = await supabase.auth.signUp({
      email: trimmed,
      password,
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    // If email confirmation is disabled, user is logged in immediately
    if (data.user && data.session) {
      window.location.href = "/onboard";
      return;
    }

    // If email confirmation is enabled
    if (data.user && !data.session) {
      setSuccess("Check your email for a confirmation link, then come back and login.");
      setMode("login");
      setPassword("");
    }

    setLoading(false);
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

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${window.location.origin}/login`,
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setSuccess("Password reset email sent! Check your inbox.");
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-navy-900 px-4 py-8">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-white">EventKhata</h1>
        <p className="mt-2 text-navy-300">Vendor Payment Tracker for Event Planners</p>
      </div>

      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-navy-900 dark:border dark:border-navy-800">
        {disabled && (
          <div className="mb-4 flex items-start gap-3 rounded-lg bg-red-50 p-3 dark:bg-red-950/40">
            <Ban className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">Account disabled</p>
              <p className="text-xs text-red-600 dark:text-red-400">
                Your access has been suspended. Please contact support to reactivate your account.
              </p>
            </div>
          </div>
        )}

        {/* Pinned Demo User Card */}
        {mode === "login" && (
          <div className="mb-5 overflow-hidden rounded-xl border border-emerald-300 bg-gradient-to-br from-emerald-50 via-teal-50/60 to-emerald-100/40 p-4 shadow-sm dark:border-emerald-800 dark:from-emerald-950/50 dark:via-navy-900 dark:to-teal-950/40">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Pinned Demo User
              </span>
              <span className="rounded-full bg-emerald-200/80 px-2 py-0.5 text-[10px] font-bold text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200">
                Ready to Test
              </span>
            </div>

            <div className="mt-2.5 rounded-lg bg-white/80 p-2.5 text-xs backdrop-blur-xs dark:bg-navy-950/60">
              <div className="flex items-center justify-between py-0.5">
                <span className="text-navy-500 dark:text-navy-400">Email:</span>
                <span className="font-mono font-semibold text-navy-900 dark:text-navy-100">{DEMO_EMAIL}</span>
              </div>
              <div className="flex items-center justify-between py-0.5">
                <span className="text-navy-500 dark:text-navy-400">Password:</span>
                <span className="font-mono font-semibold text-navy-900 dark:text-navy-100">{DEMO_PASSWORD}</span>
              </div>
              <div className="mt-1 border-t border-navy-100 pt-1 text-[11px] text-navy-500 dark:border-navy-800 dark:text-navy-400">
                Agency: <strong className="text-navy-800 dark:text-navy-200">Demo Wedding Planners</strong>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={loginAsDemo}
                disabled={loading || demoLoading}
                className="flex-1 bg-emerald-600 font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-98 dark:bg-emerald-600 dark:hover:bg-emerald-500"
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
                title="Fill demo credentials into form"
                className="border-emerald-300 bg-white px-2.5 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-navy-900 dark:text-emerald-300"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        {/* Divider if on login */}
        {mode === "login" && (
          <div className="relative mb-5 flex items-center justify-center">
            <div className="w-full border-t border-navy-200 dark:border-navy-700" />
            <span className="bg-white px-3 text-[11px] font-medium uppercase tracking-wider text-navy-400 dark:bg-navy-900 dark:text-navy-500">
              or custom login
            </span>
            <div className="w-full border-t border-navy-200 dark:border-navy-700" />
          </div>
        )}

        <form onSubmit={mode === "login" ? handleLogin : mode === "signup" ? handleSignup : handleReset} className="space-y-4">
          <div className="text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-navy-100 dark:bg-navy-800">
              {mode === "login" ? (
                <LogIn className="h-5 w-5 text-navy-600 dark:text-navy-300" />
              ) : mode === "signup" ? (
                <UserPlus className="h-5 w-5 text-navy-600 dark:text-navy-300" />
              ) : (
                <Mail className="h-5 w-5 text-navy-600 dark:text-navy-300" />
              )}
            </div>
            <h2 className="text-base font-bold text-navy-900 dark:text-navy-100">
              {mode === "login" ? "Account Sign In" : mode === "signup" ? "Create Account" : "Reset Password"}
            </h2>
            <p className="text-xs text-navy-500 dark:text-navy-400">
              {mode === "login"
                ? "Manage events, payments & contracts"
                : mode === "signup"
                ? "Start your digital bahi khata"
                : "Enter your email to receive a reset link"}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {mode !== "reset" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Password</Label>
              <Input
                type="password"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
          {success && <p className="text-xs text-emerald-600 dark:text-emerald-400">{success}</p>}

          <Button type="submit" className="w-full" size="lg" disabled={loading || demoLoading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {mode === "login" ? "Login" : mode === "signup" ? "Create Account" : "Send Reset Link"}
          </Button>

          <div className="space-y-2 text-center pt-2">
            {mode === "login" && (
              <>
                <button
                  type="button"
                  onClick={() => { setMode("reset"); setError(""); setSuccess(""); }}
                  className="block w-full text-xs text-navy-400 hover:text-navy-600 dark:text-navy-500 dark:hover:text-navy-300"
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

      <p className="mt-6 text-xs text-navy-400">
        By continuing, you agree to our{" "}
        <a href="/terms" className="underline hover:text-navy-300">Terms of Service</a>
        {" & "}
        <a href="/privacy" className="underline hover:text-navy-300">Privacy Policy</a>
      </p>
    </div>
  );
}
