"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { Loader2, Building2, Crown, LogOut, Shield, Mail, Download, Database, HelpCircle, MessageCircle, ExternalLink, Sun, Moon, Monitor } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "@/components/theme-provider";
import { CURRENCIES, setActiveCurrency } from "@/lib/utils";

export default function SettingsPage() {
  const supabase = createClient();
  const { addToast } = useToast();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

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
  const [currency, setCurrency] = useState("INR");
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
      setCurrency(agencyData.currency || "INR");
      setSubscription(agencyData.subscription_status || "free");
    }

    // Check admin separately (table may not exist)
    const { data: adminData, error: adminError } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (adminError) {
      console.error("[Settings] Admin check failed:", adminError.message);
    }
    if (adminData) setIsAdmin(true);

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
      currency,
    }).eq("id", userId);

    if (error) {
      addToast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      setActiveCurrency(currency);
      addToast({ title: "Settings saved!", variant: "success" });
    }
    setSaving(false);
  }

  const [exporting, setExporting] = useState(false);

  async function handleExportAll() {
    setExporting(true);
    const tables = ["events", "vendors", "contracts", "ledger", "sub_events", "tasks", "guests", "leads", "invoices", "proposals", "payment_schedules", "reminders", "communication_log", "team_members"];
    const zip: Record<string, string> = {};

    for (const table of tables) {
      const { data } = await supabase.from(table).select("*");
      if (data && data.length > 0) {
        const headers = Object.keys(data[0]);
        const csv = [
          headers.join(","),
          ...data.map((row: any) =>
            headers.map((h) => {
              const val = row[h];
              if (val === null || val === undefined) return "";
              const str = typeof val === "object" ? JSON.stringify(val) : String(val);
              return `"${str.replace(/"/g, '""')}"`;
            }).join(",")
          ),
        ].join("\n");
        zip[table] = csv;
      }
    }

    for (const [table, csv] of Object.entries(zip)) {
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `eventkhata-${table}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    setExporting(false);
    addToast({ title: `Exported ${Object.keys(zip).length} tables`, variant: "success" });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-navy-400" /></div>;

  return (
    <div className="px-4 pb-24 pt-4">
      <h1 className="mb-6 text-2xl font-bold text-navy-900 dark:text-navy-100">Settings</h1>

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

      {/* Appearance */}
      <div className="mb-6 rounded-xl bg-white p-4 shadow-sm dark:bg-navy-900 dark:bg-navy-900">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-100 dark:bg-navy-800">
            <Sun className="h-5 w-5 text-navy-600 dark:hidden" />
            <Moon className="hidden h-5 w-5 text-navy-400 dark:block" />
          </div>
          <h2 className="text-lg font-bold text-navy-900 dark:text-navy-100 dark:text-navy-100">Appearance</h2>
        </div>
        <div className="flex gap-2">
          {([
            { value: "light" as const, label: "Light", Icon: Sun },
            { value: "dark" as const, label: "Dark", Icon: Moon },
            { value: "system" as const, label: "Auto", Icon: Monitor },
          ]).map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex flex-1 flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-sm font-medium transition-colors ${
                theme === value
                  ? "border-navy-900 bg-navy-900 text-white dark:border-navy-300 dark:bg-navy-700 dark:text-navy-100"
                  : "border-navy-200 text-navy-600 hover:border-navy-300 dark:border-navy-700 dark:text-navy-400 dark:hover:border-navy-600"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Account Info */}
      <div className="mb-6 rounded-xl bg-white p-4 shadow-sm dark:bg-navy-900 dark:bg-navy-900">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-100 dark:bg-navy-800">
            <Mail className="h-5 w-5 text-navy-600 dark:text-navy-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-navy-900 dark:text-navy-100">Account</h2>
            <p className="text-sm text-navy-500">{userEmail}</p>
          </div>
        </div>
      </div>

      {/* Agency Profile */}
      <div className="mb-6 rounded-xl bg-white p-4 shadow-sm dark:bg-navy-900">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-100 dark:bg-navy-800">
            <Building2 className="h-5 w-5 text-navy-600 dark:text-navy-400" />
          </div>
          <h2 className="text-lg font-bold text-navy-900 dark:text-navy-100">Agency Profile</h2>
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
          <div className="space-y-2">
            <Label>Currency</Label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-lg border border-navy-200 p-3 text-sm dark:border-navy-700 dark:bg-navy-800 dark:text-navy-100">
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
            <p className="text-xs text-navy-400">Used across the app for NRI &amp; destination weddings.</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Profile
          </Button>
        </div>
      </div>

      {/* Subscription */}
      <div className="mb-6 rounded-xl bg-white p-4 shadow-sm dark:bg-navy-900">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
            <Crown className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-navy-900 dark:text-navy-100">Subscription</h2>
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
      <div className="mb-6 rounded-xl bg-white p-4 shadow-sm dark:bg-navy-900">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <Database className="h-5 w-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-bold text-navy-900 dark:text-navy-100">Data & Privacy</h2>
        </div>
        <div className="space-y-3">
          <Button variant="outline" size="sm" className="w-full" onClick={handleExportAll} disabled={exporting}>
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {exporting ? "Exporting..." : "Export All Data (CSV)"}
          </Button>
          <p className="text-xs text-navy-400 text-center">Downloads separate CSV files for each data table. Your data is stored securely and never shared.</p>
        </div>
      </div>

      {/* Help & Support */}
      <div className="mb-6 rounded-xl bg-white p-4 shadow-sm dark:bg-navy-900">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
            <HelpCircle className="h-5 w-5 text-purple-600" />
          </div>
          <h2 className="text-lg font-bold text-navy-900 dark:text-navy-100">Help & Support</h2>
        </div>
        <div className="space-y-2">
          <a
            href="https://wa.me/919999999999?text=Hi%2C%20I%20need%20help%20with%20EventKhata"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg border border-navy-200 p-3 text-sm text-navy-700 hover:bg-navy-50 dark:border-navy-700 dark:text-navy-300 dark:hover:bg-navy-800"
          >
            <MessageCircle className="h-4 w-4 text-emerald-600" />
            <span className="flex-1">Chat with Support</span>
            <ExternalLink className="h-3.5 w-3.5 text-navy-400" />
          </a>
          <a
            href="mailto:support@eventkhata.com?subject=EventKhata%20Support"
            className="flex items-center gap-3 rounded-lg border border-navy-200 p-3 text-sm text-navy-700 hover:bg-navy-50 dark:border-navy-700 dark:text-navy-300 dark:hover:bg-navy-800"
          >
            <Mail className="h-4 w-4 text-blue-600" />
            <span className="flex-1">Email Support</span>
            <ExternalLink className="h-3.5 w-3.5 text-navy-400" />
          </a>
        </div>
      </div>

      {/* Logout */}
      <Button variant="outline" onClick={handleLogout} className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20">
        <LogOut className="mr-2 h-4 w-4" /> Logout
      </Button>

      {/* App Info */}
      <div className="mt-6 text-center">
        <p className="text-xs text-navy-400">EventKhata v1.0.0</p>
        <p className="text-[10px] text-navy-300">Digital Bahi Khata for Event Planners</p>
      </div>
    </div>
  );
}
