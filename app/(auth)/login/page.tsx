"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, KeyRound } from "lucide-react";

export default function LoginPage() {
  const supabase = createClient();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSendOTP(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Enter a valid email address");
      return;
    }
    setLoading(true);

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: trimmed,
    });

    if (otpError) {
      setError(otpError.message);
    } else {
      setStep("otp");
    }
    setLoading(false);
  }

  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (otp.length < 6) {
      setError("Enter the 6-digit OTP");
      return;
    }
    setLoading(true);

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: otp,
      type: "email",
    });

    if (verifyError) {
      setError(verifyError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Check if agency exists for this user
      const { data: agency } = await supabase
        .from("agencies")
        .select("id")
        .eq("id", data.user.id)
        .single();

      if (agency) {
        window.location.href = "/events";
      } else {
        window.location.href = "/onboard";
      }
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-navy-900 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white">EventKhata</h1>
        <p className="mt-2 text-navy-300">Vendor Payment Tracker for Event Planners</p>
      </div>

      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
        {step === "email" ? (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-navy-100">
                <Mail className="h-6 w-6 text-navy-600" />
              </div>
              <h2 className="text-lg font-bold text-navy-900">Login with Email</h2>
              <p className="text-sm text-navy-500">We&apos;ll send you a verification code</p>
            </div>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send OTP
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <KeyRound className="h-6 w-6 text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold text-navy-900">Enter OTP</h2>
              <p className="text-sm text-navy-500">
                Sent to {email.trim().toLowerCase()}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Verification Code</Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                autoFocus
                className="text-center text-2xl tracking-widest"
                maxLength={6}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Verify & Login
            </Button>
            <button
              type="button"
              onClick={() => { setStep("email"); setOtp(""); setError(""); }}
              className="w-full text-center text-sm text-navy-500 hover:text-navy-700"
            >
              Change email
            </button>
          </form>
        )}
      </div>

      <p className="mt-6 text-xs text-navy-400">
        By continuing, you agree to our Terms of Service
      </p>
    </div>
  );
}
