"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Copy, Check, Link as LinkIcon, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function ShareEventPage() {
  const params = useParams();
  const eventId = params.id as string;
  const supabase = createClient();
  const { addToast } = useToast();

  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadToken();
  }, []);

  async function loadToken() {
    const { data } = await supabase
      .from("client_tokens")
      .select("token")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (data) setToken(data.token);
    setLoading(false);
  }

  async function generateToken() {
    setGenerating(true);
    const { data, error } = await supabase
      .from("client_tokens")
      .insert({
        event_id: eventId,
        show_vendor_names: true,
        show_vendor_amounts: false,
      })
      .select()
      .single();

    if (data) {
      setToken(data.token);
      addToast({ title: "Link generated!", variant: "success" });
    }
    if (error) {
      addToast({ title: "Failed to generate link", variant: "destructive" });
    }
    setGenerating(false);
  }

  const shareUrl = token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/client/${token}`
    : "";

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    addToast({ title: "Link copied to clipboard!", variant: "success" });
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="px-4 pt-4">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/events/${eventId}`} className="rounded-full p-2 hover:bg-navy-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Share with Client</h1>
      </div>

      <Card>
        <CardContent className="p-6 text-center">
          <div className="mb-4 flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-navy-100">
            <LinkIcon className="h-8 w-8 text-navy-400" />
          </div>

          <h2 className="mb-2 text-lg font-semibold">Client Portal Link</h2>
          <p className="mb-6 text-sm text-navy-500">
            Share this link with your client. They can view budget utilization
            without seeing vendor-specific amounts.
          </p>

          {loading ? (
            <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-navy-400" /></div>
          ) : token ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-navy-50 p-3 text-sm text-navy-700 break-all">
                {shareUrl}
              </div>
              <Button onClick={copyLink} className="w-full" size="lg">
                {copied ? (
                  <><Check className="mr-2 h-4 w-4" /> Copied!</>
                ) : (
                  <><Copy className="mr-2 h-4 w-4" /> Copy Link</>
                )}
              </Button>
            </div>
          ) : (
            <Button onClick={generateToken} className="w-full" size="lg" disabled={generating}>
              {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LinkIcon className="mr-2 h-4 w-4" />
              )}
              Generate Link
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
