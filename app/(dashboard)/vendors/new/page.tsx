"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { VENDOR_CATEGORIES, isValidPhone, isValidIFSC } from "@/lib/utils";

export default function NewVendorPage() {
  const router = useRouter();
  const supabase = createClient();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: "",
    category: "other",
    phone: "",
    upi_id: "",
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) newErrors.name = "Vendor name is required";
    if (form.phone && !isValidPhone(form.phone)) newErrors.phone = "Enter a valid 10-digit phone number";
    if (form.ifsc_code && !isValidIFSC(form.ifsc_code)) newErrors.ifsc_code = "Enter a valid IFSC code (e.g., SBIN0001234)";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setLoading(true);

    const { requireUser } = await import("@/lib/auth");
    const user = await requireUser();

    const { data, error } = await supabase
      .from("vendors")
      .insert({
        agency_id: user.id,
        name: form.name,
        category: form.category,
        phone: form.phone || null,
        upi_id: form.upi_id || null,
        bank_name: form.bank_name || null,
        account_number: form.account_number || null,
        ifsc_code: form.ifsc_code || null,
        notes: form.notes || null,
      })
      .select()
      .single();

    if (error) {
      addToast({ title: "Failed to save vendor", description: error.message, variant: "destructive" });
    } else if (data) {
      addToast({ title: "Vendor created!", variant: "success" });
      router.push(`/vendors/${data.id}`);
    }
    setLoading(false);
  };

  return (
    <div className="px-4 pt-4">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/vendors" className="rounded-full p-2 hover:bg-navy-100 dark:hover:bg-navy-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">New Vendor</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Vendor Name *</Label>
          <Input
            id="name"
            placeholder="e.g., Sharma Decorators"
            value={form.name}
            onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: "" }); }}
            required
            autoFocus
            className={errors.name ? "border-red-500" : ""}
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <div className="flex flex-wrap gap-2">
            {VENDOR_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setForm({ ...form, category: cat.value })}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  form.category === cat.value
                    ? "bg-navy-900 text-white dark:bg-navy-100 dark:text-navy-900"
                    : "bg-white text-navy-600 border border-navy-200 dark:bg-navy-800 dark:text-navy-300 dark:border-navy-700"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="98765 43210"
            value={form.phone}
            onChange={(e) => { setForm({ ...form, phone: e.target.value }); setErrors({ ...errors, phone: "" }); }}
            inputMode="numeric"
            className={errors.phone ? "border-red-500" : ""}
          />
          {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="upi">UPI ID</Label>
          <Input
            id="upi"
            placeholder="vendor@upi"
            value={form.upi_id}
            onChange={(e) => setForm({ ...form, upi_id: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bank">Bank Name</Label>
          <Input
            id="bank"
            placeholder="e.g., SBI, HDFC"
            value={form.bank_name}
            onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="account">Account No.</Label>
            <Input
              id="account"
              placeholder="Account number"
              value={form.account_number}
              onChange={(e) => setForm({ ...form, account_number: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ifsc">IFSC Code</Label>
            <Input
              id="ifsc"
              placeholder="SBIN0001234"
              value={form.ifsc_code}
              onChange={(e) => setForm({ ...form, ifsc_code: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Any notes about this vendor..."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Vendor
        </Button>
      </form>
    </div>
  );
}
