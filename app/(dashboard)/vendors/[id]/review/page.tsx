"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StarRating } from "@/components/star-rating";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

type ReviewData = {
  event_id: string;
  rating: number;
  review: string;
  punctuality: number;
  quality: number;
  value_for_money: number;
  communication: number;
};

export default function VendorReviewPage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = params.id as string;
  const supabase = createClient();
  const { addToast } = useToast();

  const [vendorName, setVendorName] = useState("");
  const [events, setEvents] = useState<{ id: string; client_name: string }[]>([]);
  const [existingReviews, setExistingReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ReviewData>({
    event_id: "",
    rating: 0,
    review: "",
    punctuality: 0,
    quality: 0,
    value_for_money: 0,
    communication: 0,
  });

  useEffect(() => { load(); }, [vendorId]);

  async function load() {
    const [vendorRes, contractsRes, reviewsRes] = await Promise.all([
      supabase.from("vendors").select("name").eq("id", vendorId).single(),
      supabase.from("contracts").select("event_id, event:events(id, client_name)").eq("vendor_id", vendorId),
      supabase.from("vendor_reviews").select("*").eq("vendor_id", vendorId).order("created_at", { ascending: false }),
    ]);

    if (vendorRes.data) setVendorName(vendorRes.data.name);

    const eventList: { id: string; client_name: string }[] = [];
    (contractsRes.data || []).forEach((c: any) => {
      if (c.event && !eventList.find((e) => e.id === c.event.id)) {
        eventList.push({ id: c.event.id, client_name: c.event.client_name });
      }
    });
    setEvents(eventList);
    setExistingReviews(reviewsRes.data || []);
    setLoading(false);
  }

  async function handleSubmit() {
    if (form.rating === 0) {
      addToast({ title: "Please select an overall rating", variant: "destructive" });
      return;
    }
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    const { data: agency } = await supabase.from("agencies").select("id").eq("id", user?.id).single();

    const { error } = await supabase.from("vendor_reviews").insert({
      agency_id: agency?.id || user?.id,
      vendor_id: vendorId,
      event_id: form.event_id || null,
      rating: form.rating,
      review: form.review || null,
      punctuality: form.punctuality || null,
      quality: form.quality || null,
      value_for_money: form.value_for_money || null,
      communication: form.communication || null,
    });

    if (error) {
      addToast({ title: "Failed to save review", description: error.message, variant: "destructive" });
    } else {
      // Update vendor's average rating
      const { data: allReviews } = await supabase
        .from("vendor_reviews")
        .select("rating")
        .eq("vendor_id", vendorId);
      if (allReviews && allReviews.length > 0) {
        const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
        await supabase.from("vendors").update({ rating: Math.round(avg) }).eq("id", vendorId);
      }
      addToast({ title: "Review saved!", variant: "success" });
      router.push(`/vendors/${vendorId}`);
    }
    setSaving(false);
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-navy-400" /></div>;

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/vendors/${vendorId}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-navy-900">Review {vendorName}</h1>
          <p className="text-sm text-navy-500">Rate your experience</p>
        </div>
      </div>

      {/* Event selector */}
      {events.length > 0 && (
        <div className="mb-4 space-y-2">
          <Label>For which event?</Label>
          <select
            value={form.event_id}
            onChange={(e) => setForm({ ...form, event_id: e.target.value })}
            className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">General review</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.client_name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Overall Rating */}
      <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
        <Label className="mb-3 block">Overall Rating *</Label>
        <div className="flex justify-center">
          <StarRating rating={form.rating} onRate={(r) => setForm({ ...form, rating: r })} size="lg" />
        </div>
      </div>

      {/* Detailed Ratings */}
      <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-navy-900">Detailed Rating</h3>
        <div className="space-y-4">
          {[
            { key: "punctuality", label: "Punctuality" },
            { key: "quality", label: "Quality of Work" },
            { key: "value_for_money", label: "Value for Money" },
            { key: "communication", label: "Communication" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-navy-700">{label}</span>
              <StarRating
                rating={(form as any)[key]}
                onRate={(r) => setForm({ ...form, [key]: r })}
                size="sm"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Written Review */}
      <div className="mb-6 space-y-2">
        <Label>Written Review</Label>
        <textarea
          value={form.review}
          onChange={(e) => setForm({ ...form, review: e.target.value })}
          placeholder="How was your experience with this vendor?"
          className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm"
          rows={4}
        />
      </div>

      <Button onClick={handleSubmit} disabled={saving} className="w-full">
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Submit Review
      </Button>

      {/* Existing Reviews */}
      {existingReviews.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-lg font-semibold text-navy-900">Past Reviews</h3>
          <div className="space-y-3">
            {existingReviews.map((review) => (
              <div key={review.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <StarRating rating={review.rating} readonly size="sm" />
                  <span className="text-xs text-navy-500">{new Date(review.created_at).toLocaleDateString("en-IN")}</span>
                </div>
                {review.review && <p className="text-sm text-navy-700">{review.review}</p>}
                <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-navy-500">
                  {review.punctuality && <span>Punctuality: {review.punctuality}/5</span>}
                  {review.quality && <span>Quality: {review.quality}/5</span>}
                  {review.value_for_money && <span>Value: {review.value_for_money}/5</span>}
                  {review.communication && <span>Communication: {review.communication}/5</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
