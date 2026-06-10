"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, X, CalendarDays, Users, UserPlus, FileText, IndianRupee } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";

type SearchResult = {
  id: string;
  type: "event" | "vendor" | "lead" | "invoice" | "proposal";
  title: string;
  subtitle: string;
  href: string;
};

const TYPE_ICONS = {
  event: CalendarDays,
  vendor: Users,
  lead: UserPlus,
  invoice: FileText,
  proposal: FileText,
};

const TYPE_COLORS = {
  event: "bg-blue-50 text-blue-600",
  vendor: "bg-purple-50 text-purple-600",
  lead: "bg-emerald-50 text-emerald-600",
  invoice: "bg-amber-50 text-amber-600",
  proposal: "bg-pink-50 text-pink-600",
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    const term = `%${q}%`;

    const [eventsRes, vendorsRes, leadsRes, invoicesRes, proposalsRes] = await Promise.all([
      supabase.from("events").select("id, client_name, event_type, venue, status").ilike("client_name", term).limit(5),
      supabase.from("vendors").select("id, name, category, phone").ilike("name", term).limit(5),
      supabase.from("leads").select("id, client_name, event_type, status").ilike("client_name", term).limit(5),
      supabase.from("invoices").select("id, invoice_number, client_name, total, status").or(`client_name.ilike.${term},invoice_number.ilike.${term}`).limit(5),
      supabase.from("proposals").select("id, proposal_number, client_name, total, status").or(`client_name.ilike.${term},proposal_number.ilike.${term}`).limit(5),
    ]);

    const items: SearchResult[] = [];

    (eventsRes.data || []).forEach((e) => items.push({
      id: e.id, type: "event", title: e.client_name,
      subtitle: `${e.event_type} - ${e.status}${e.venue ? ` - ${e.venue}` : ""}`,
      href: `/events/${e.id}`,
    }));

    (vendorsRes.data || []).forEach((v) => items.push({
      id: v.id, type: "vendor", title: v.name,
      subtitle: `${(v.category || "").replace("_", " ")}${v.phone ? ` - ${v.phone}` : ""}`,
      href: `/vendors/${v.id}`,
    }));

    (leadsRes.data || []).forEach((l) => items.push({
      id: l.id, type: "lead", title: l.client_name,
      subtitle: `${l.event_type} lead - ${l.status}`,
      href: `/leads`,
    }));

    (invoicesRes.data || []).forEach((inv) => items.push({
      id: inv.id, type: "invoice", title: `${inv.invoice_number} - ${inv.client_name}`,
      subtitle: `${formatCurrency(inv.total)} - ${inv.status}`,
      href: `/invoices/${inv.id}`,
    }));

    (proposalsRes.data || []).forEach((p) => items.push({
      id: p.id, type: "proposal", title: `${p.proposal_number} - ${p.client_name}`,
      subtitle: `${formatCurrency(p.total)} - ${p.status}`,
      href: `/proposals/${p.id}`,
    }));

    setResults(items);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  function handleSelect(result: SearchResult) {
    setOpen(false);
    router.push(result.href);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm text-navy-400 shadow-sm transition-shadow hover:shadow-md w-full"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search events, vendors, leads...</span>
        <kbd className="hidden rounded bg-navy-100 px-1.5 py-0.5 text-[10px] font-semibold text-navy-500 sm:inline">
          Ctrl+K
        </kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]" onClick={() => setOpen(false)}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative z-10 mx-4 w-full max-w-lg rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-navy-100 px-4 py-3">
          <Search className="h-5 w-5 text-navy-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events, vendors, leads, invoices..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-navy-400"
          />
          <button onClick={() => setOpen(false)} className="rounded-lg p-1 hover:bg-navy-100">
            <X className="h-4 w-4 text-navy-400" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-navy-200 border-t-navy-600" />
            </div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="py-8 text-center text-sm text-navy-500">
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}

          {!loading && query.length < 2 && (
            <div className="py-8 text-center text-sm text-navy-400">
              Type at least 2 characters to search
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-1">
              {results.map((result) => {
                const Icon = TYPE_ICONS[result.type];
                const colorClass = TYPE_COLORS[result.type];
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-navy-50"
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-navy-900">{result.title}</p>
                      <p className="truncate text-xs text-navy-500">{result.subtitle}</p>
                    </div>
                    <span className="rounded-full bg-navy-100 px-2 py-0.5 text-[10px] font-medium capitalize text-navy-500">
                      {result.type}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
