"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { Loader2, Building2, Crown, LogOut, Shield, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SettingsPage() {
  const supabase = createClient();
  const { addToast } = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [agencyName, setAgencyName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [subscription, setSubscription] = useState("free");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    setUserId(user.id);
    setUserEmail(user.email || "");

    // Load agency data
    const { data: agencyData, error: agencyError } = await supabase
      .from("agencies")
      .select("*")
      .eq("id", user.id)
      .single();

    if (agencyData) {
      setAgencyName(agencyData.name || "");
      setOwnerName(agencyData.owner_name || "");
      setOwnerPhone(agencyData.owner_phone || "");
      setCity(agencyData.city || "");
      setState(agencyData.state || "");
      setSubscription(agencyData.subscription_status || "free");
    }

    // Check admin separately (table may not exist)
    try {
      const { data: adminData } = await supabase
        .from("admin_users")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();
      if (adminData) setIsAdmin(true);
    } catch {
      // admin_users table may not exist yet
    }

    setLoading(false);
  }

  async function handleSave() {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from("agencies").update({
      name: agencyName,
      owner_name: ownerName,
      owner_phone: ownerPhone,
      owner_email: userEmail || null,
      city: city || null,
      state: state || null,
    }).eq("id", userId);

    if (error) {
      addToast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      addToast({ title: "Settings saved!", variant: "success" });
    }
    setSaving(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-navy-400" /></div>;

  return (
    <div className="px-4 pb-24 pt-4">
      <h1 className="mb-6 text-2xl font-bold text-navy-900">Settings</h1>

      {/* Admin Access */}
      {isAdmin && (
        <Link href="/admin" className="mb-6 flex items-center gap-3 rounded-xl bg-slate-900 p-4 text-white shadow-sm">
          <Shield className="h-5 w-5 text-amber-400" />
          <div className="flex-1">
            <p className="font-bold">Super Admin Dashboard</p>
            <p className="text-sm text-slate-300">View all agencies, platform stats</p>
          </div>
          <span className="text-sm text-slate-400">&rarr;</span>
        </Link>
      )}

      {/* Account Info */}
      <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-100">
            <Mail className="h-5 w-5 text-navy-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-navy-900">Account</h2>
            <p className="text-sm text-navy-500">{userEmail}</p>
          </div>
        </div>
      </div>

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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g., Mumbai" />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g., Maharashtra" />
            </div>
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
      <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-navy-900">Data & Privacy</h2>
        <div className="space-y-3">
          <Button variant="outline" size="sm" className="w-full">Export All Data (CSV)</Button>
          <p className="text-xs text-navy-400 text-center">Your data is stored securely and never shared.</p>
        </div>
      </div>

      {/* Logout */}
      <Button variant="outline" onClick={handleLogout} className="w-full text-red-600 hover:bg-red-50 hover:text-red-700">
        <LogOut className="mr-2 h-4 w-4" /> Logout
      </Button>
    </div>
  );
}
