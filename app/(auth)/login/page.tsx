"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, LogIn, UserPlus } from "lucide-react";

export default function LoginPage() {
  const supabase = createClient();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { data: agency } = await supabase
        .from("agencies")
        .select("id")
        .eq("id", data.user.id)
        .single();

      window.location.href = agency ? "/events" : "/onboard";
    }
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-navy-900 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white">EventKhata</h1>
        <p className="mt-2 text-navy-300">Vendor Payment Tracker for Event Planners</p>
      </div>

      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
        <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="space-y-4">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-navy-100">
              {mode === "login" ? (
                <LogIn className="h-6 w-6 text-navy-600" />
              ) : (
                <UserPlus className="h-6 w-6 text-navy-600" />
              )}
            </div>
            <h2 className="text-lg font-bold text-navy-900">
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </h2>
            <p className="text-sm text-navy-500">
              {mode === "login"
                ? "Login to manage your events"
                : "Sign up to start tracking vendor payments"}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Password</Label>
            <Input
              type="password"
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-emerald-600">{success}</p>}

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {mode === "login" ? "Login" : "Create Account"}
          </Button>

          <div className="text-center">
            {mode === "login" ? (
              <button
                type="button"
                onClick={() => { setMode("signup"); setError(""); setSuccess(""); }}
                className="text-sm text-navy-500 hover:text-navy-700"
              >
                Don&apos;t have an account? <span className="font-semibold text-navy-900">Sign up</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
                className="text-sm text-navy-500 hover:text-navy-700"
              >
                Already have an account? <span className="font-semibold text-navy-900">Login</span>
              </button>
            )}
          </div>
        </form>
      </div>

      <p className="mt-6 text-xs text-navy-400">
        By continuing, you agree to our Terms of Service
      </p>
    </div>
  );
}
