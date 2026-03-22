"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/currency-input";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Loader2, Plus, Save } from "lucide-react";
import type { Vendor, SubEvent } from "@/lib/types";

export default function AddVendorToEventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const supabase = createClient();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [subEvents, setSubEvents] = useState<SubEvent[]>([]);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [selectedFunction, setSelectedFunction] = useState("");
  const [agreedAmount, setAgreedAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [vRes, seRes] = await Promise.all([
      supabase.from("vendors").select("*").order("name"),
      supabase.from("sub_events").select("*").eq("event_id", eventId).order("sort_order"),
    ]);
    if (vRes.error) console.error("[AddVendor] Failed to load vendors:", vRes.error.message);
    if (vRes.data) setVendors(vRes.data);
    if (seRes.data) setSubEvents(seRes.data);
    setLoading(false);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor || !agreedAmount) return;
    setSaving(true);

    const { error } = await supabase.from("contracts").insert({
      event_id: eventId,
      vendor_id: selectedVendor,
      agreed_amount: Number(agreedAmount),
      description: description || null,
      sub_event_id: selectedFunction || null,
    });

    if (error) {
      console.error("[AddVendor] Failed to insert contract:", error.message, error);
    } else {
      router.push(`/events/${eventId}`);
    }
    setSaving(false);
  };

  const filteredVendors = vendors.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="px-4 pt-4">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/events/${eventId}`} className="rounded-full p-2 hover:bg-navy-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Add Vendor</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Select Vendor *</Label>
          <Input
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-navy-200 p-1">
              {filteredVendors.map((vendor) => (
                <button
                  key={vendor.id}
                  type="button"
                  onClick={() => setSelectedVendor(vendor.id)}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
                    selectedVendor === vendor.id
                      ? "bg-navy-900 text-white"
                      : "hover:bg-navy-50"
                  }`}
                >
                  <span className="font-medium">{vendor.name}</span>
                  <span className={`text-xs capitalize ${selectedVendor === vendor.id ? "text-navy-200" : "text-navy-400"}`}>
                    {vendor.category?.replace("_", " ")}
                  </span>
                </button>
              ))}
              {filteredVendors.length === 0 && (
                <div className="py-4 text-center text-sm text-navy-500">
                  No vendors found.{" "}
                  <Link href="/vendors/new" className="text-navy-900 underline">
                    Create one
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Agreed Amount *</Label>
          <CurrencyInput
            value={agreedAmount}
            onChange={setAgreedAmount}
            placeholder="0"
          />
        </div>

        {subEvents.length > 0 && (
          <div className="space-y-2">
            <Label>Assign to Function (optional)</Label>
            <select
              value={selectedFunction}
              onChange={(e) => setSelectedFunction(e.target.value)}
              className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2.5 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
            >
              <option value="">— No specific function —</option>
              {subEvents.map((se) => (
                <option key={se.id} value={se.id}>
                  {se.name}{se.date ? ` (${se.date})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            placeholder="e.g., Main stage decoration"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={saving || !selectedVendor || !agreedAmount}
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Add Vendor to Event
        </Button>
      </form>
    </div>
  );
}
