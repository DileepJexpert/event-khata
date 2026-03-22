"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { Loader2, Building2, User, Phone, Crown } from "lucide-react";

export default function SettingsPage() {
  const supabase = createClient();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agencyName, setAgencyName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [subscription, setSubscription] = useState("free");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const { getDevUser } = await import("@/lib/dev-user");
    const user = getDevUser();
    const { data } = await supabase.from("agencies").select("*").eq("id", user.id).single();
    if (data) {
      setAgencyName(data.name || "");
      setOwnerName(data.owner_name || "");
      setOwnerPhone(data.owner_phone || "");
      setSubscription(data.subscription_status || "free");
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    const { getDevUser } = await import("@/lib/dev-user");
    const user = getDevUser();
    const { error } = await supabase.from("agencies").update({
      name: agencyName,
      owner_name: ownerName,
      owner_phone: ownerPhone,
    }).eq("id", user.id);

    if (error) {
      addToast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      addToast({ title: "Settings saved!", variant: "success" });
    }
    setSaving(false);
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-navy-400" /></div>;

  return (
    <div className="px-4 pb-24 pt-4">
      <h1 className="mb-6 text-2xl font-bold text-navy-900">Settings</h1>

      {/* Agency Profile */}
      <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-100">
            <Building2 className="h-5 w-5 text-navy-600" />
          </div>
          <h2 className="text-lg font-bold text-navy-900">Agency Profile</h2>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Agency Name</Label>
            <Input value={agencyName} onChange={(e) => setAgencyName(e.target.value)} placeholder="Your agency name" />
          </div>
          <div className="space-y-2">
            <Label>Owner Name</Label>
            <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} type="tel" />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Profile
          </Button>
        </div>
      </div>

      {/* Subscription */}
      <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
            <Crown className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-navy-900">Subscription</h2>
            <p className="text-sm capitalize text-navy-500">{subscription} Plan</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="rounded-lg border-2 border-navy-200 p-4">
            <h3 className="font-bold text-navy-900">Free Plan</h3>
            <ul className="mt-2 space-y-1 text-sm text-navy-600">
              <li>&#10003; Up to 5 active events</li>
              <li>&#10003; Up to 20 vendors</li>
              <li>&#10003; Basic reports</li>
              <li>&#10003; WhatsApp sharing</li>
            </ul>
          </div>
          <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-emerald-900">Pro Plan</h3>
              <span className="text-sm font-bold text-emerald-700">Coming Soon</span>
            </div>
            <ul className="mt-2 space-y-1 text-sm text-emerald-800">
              <li>&#10003; Unlimited events & vendors</li>
              <li>&#10003; Invoice generation</li>
              <li>&#10003; Team collaboration</li>
              <li>&#10003; Advanced analytics</li>
              <li>&#10003; Priority support</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Data */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-navy-900">Data & Privacy</h2>
        <div className="space-y-3">
          <Button variant="outline" size="sm" className="w-full">Export All Data (CSV)</Button>
          <p className="text-xs text-navy-400 text-center">Your data is stored securely and never shared.</p>
        </div>
      </div>
    </div>
  );
}
