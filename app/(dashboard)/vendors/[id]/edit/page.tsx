"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { VENDOR_CATEGORIES } from "@/lib/utils";
import Link from "next/link";

export default function EditVendorPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const { addToast } = useToast();
  const vendorId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [upiId, setUpiId] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadVendor();
  }, []);

  async function loadVendor() {
    const { data, error } = await supabase.from("vendors").select("*").eq("id", vendorId).single();
    if (error || !data) {
      addToast({ title: "Vendor not found", variant: "destructive" });
      router.push("/vendors");
      return;
    }
    setName(data.name);
    setCategory(data.category || "");
    setPhone(data.phone || "");
    setEmail(data.email || "");
    setUpiId(data.upi_id || "");
    setBankName(data.bank_name || "");
    setAccountNumber(data.account_number || "");
    setIfscCode(data.ifsc_code || "");
    setAddress(data.address || "");
    setNotes(data.notes || "");
    setLoading(false);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("vendors")
      .update({
        name: name.trim(),
        category: category || null,
        phone: phone || null,
        email: email || null,
        upi_id: upiId || null,
        bank_name: bankName || null,
        account_number: accountNumber || null,
        ifsc_code: ifscCode || null,
        address: address || null,
        notes: notes || null,
      })
      .eq("id", vendorId);

    if (error) {
      addToast({ title: "Failed to update", description: error.message, variant: "destructive" });
    } else {
      addToast({ title: "Vendor updated!", variant: "success" });
      router.push(`/vendors/${vendorId}`);
    }
    setSaving(false);
  }

  async function handleDelete() {
    setDeleting(true);
    const { error } = await supabase.from("vendors").delete().eq("id", vendorId);
    if (error) {
      addToast({ title: "Failed to delete", description: error.message, variant: "destructive" });
      setDeleting(false);
    } else {
      addToast({ title: "Vendor deleted", variant: "success" });
      router.push("/vendors");
    }
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-navy-400" /></div>;
  }

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/vendors/${vendorId}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Edit Vendor</h1>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Vendor Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {VENDOR_CATEGORIES.map((c) => (
              <button key={c.value} type="button" onClick={() => setCategory(c.value)}
                className={`rounded-lg border-2 px-2 py-2 text-xs font-semibold transition-colors ${
                  category === c.value ? "border-navy-900 bg-navy-900 text-white" : "border-navy-200 bg-white text-navy-600"
                }`}>{c.label}</button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        </div>
        <div className="space-y-2">
          <Label>UPI ID</Label>
          <Input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="name@upi" />
        </div>
        <div className="space-y-2">
          <Label>Bank Name</Label>
          <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Account Number</Label>
            <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>IFSC Code</Label>
            <Input value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Address</Label>
          <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
        </div>
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>

        <Button onClick={handleSave} size="lg" className="w-full" disabled={saving || !name.trim()}>
          {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
          Save Changes
        </Button>

        <div className="border-t border-navy-200 pt-4">
          {!showDeleteConfirm ? (
            <Button variant="destructive" size="lg" className="w-full" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete Vendor
            </Button>
          ) : (
            <div className="space-y-2 rounded-xl bg-red-50 p-4">
              <p className="text-sm font-medium text-red-700">Delete this vendor and all linked contracts?</p>
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Yes, Delete
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
