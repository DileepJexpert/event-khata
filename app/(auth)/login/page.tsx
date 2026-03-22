"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Phone, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      setError("Please enter a valid 10-digit phone number");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      phone: `+91${cleanPhone}`,
    });

    if (error) {
      setError(error.message);
    } else {
      setStep("otp");
    }
    setLoading(false);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const cleanPhone = phone.replace(/\D/g, "");
    const { error } = await supabase.auth.verifyOtp({
      phone: `+91${cleanPhone}`,
      token: otp,
      type: "sms",
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Check if agency exists
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: agency } = await supabase
        .from("agencies")
        .select("id")
        .eq("id", user.id)
        .single();

      if (agency) {
        window.location.href = "/events";
      } else {
        window.location.href = "/onboard";
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-navy-900 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white">EventKhata</h1>
        <p className="mt-2 text-navy-300">Your digital bahi khata for events</p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>{step === "phone" ? "Login" : "Verify OTP"}</CardTitle>
          <CardDescription>
            {step === "phone"
              ? "Enter your phone number to get started"
              : `We sent a code to +91 ${phone}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "phone" ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex gap-2">
                  <div className="flex h-11 items-center rounded-lg border border-navy-200 bg-navy-50 px-3 text-sm text-navy-500">
                    +91
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={10}
                    inputMode="numeric"
                    className="flex-1"
                    autoFocus
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Phone className="mr-2 h-4 w-4" />
                )}
                Send OTP
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Enter 6-digit OTP</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  maxLength={6}
                  inputMode="numeric"
                  className="text-center text-2xl tracking-[0.5em]"
                  autoFocus
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                Verify & Login
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
              >
                Change phone number
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
