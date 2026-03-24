"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Phone, KeyRound } from "lucide-react";

export default function LoginPage() {
  const supabase = createClient();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fullPhone = phone.startsWith("+") ? phone : `+91${phone.replace(/\D/g, "")}`;

  async function handleSendOTP(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 10) {
      setError("Enter a valid 10-digit phone number");
      return;
    }
    setLoading(true);

    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: fullPhone,
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
      phone: fullPhone,
      token: otp,
      type: "sms",
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
        {step === "phone" ? (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-navy-100">
                <Phone className="h-6 w-6 text-navy-600" />
              </div>
              <h2 className="text-lg font-bold text-navy-900">Login with Phone</h2>
              <p className="text-sm text-navy-500">We&apos;ll send you a verification code</p>
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <div className="flex gap-2">
                <div className="flex h-10 items-center rounded-md border border-navy-200 bg-navy-50 px-3 text-sm text-navy-600">
                  +91
                </div>
                <Input
                  type="tel"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="numeric"
                  autoFocus
                  className="flex-1"
                />
              </div>
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
                Sent to {fullPhone}
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
              onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
              className="w-full text-center text-sm text-navy-500 hover:text-navy-700"
            >
              Change phone number
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
