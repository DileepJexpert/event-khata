"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Loader2 } from "lucide-react";

export default function OnboardPage() {
  const [agencyName, setAgencyName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [userPhone, setUserPhone] = useState<string>("");

  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }
      setUserId(user.id);
      setUserPhone(user.phone || "");
    }
    getUser();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!agencyName.trim()) {
      setError("Please enter your agency name");
      setLoading(false);
      return;
    }

    if (!userId) {
      setError("Not authenticated. Please login again.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("agencies").insert({
      id: userId,
      name: agencyName.trim(),
      owner_name: ownerName.trim() || null,
      owner_phone: userPhone,
    });

    if (insertError) {
      console.error("[Onboard] Failed to create agency:", insertError.message, insertError);
      setError(insertError.message);
      setLoading(false);
      return;
    }

    window.location.href = "/events";
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-navy-900 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white">Welcome to EventKhata</h1>
        <p className="mt-2 text-navy-300">Let&apos;s set up your agency</p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Create Your Agency</CardTitle>
          <CardDescription>
            This is how your agency will appear in EventKhata
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agencyName">Agency Name *</Label>
              <Input
                id="agencyName"
                placeholder="e.g., Sharma Events"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerName">Your Name</Label>
              <Input
                id="ownerName"
                placeholder="e.g., Rajesh Sharma"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" size="lg" disabled={loading || !userId}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Building2 className="mr-2 h-4 w-4" />
              )}
              Get Started
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
