"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Moon, Info } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Static panchang data — Shubh Vivah Muhurat dates for 2026 & 2027.
// Based on widely-published traditional Hindu panchang (Drik Panchang) lists.
// Dates are indicative; exact muhurat timing varies by city and lagna.
// ---------------------------------------------------------------------------

type Year = 2026 | 2027;

interface MuhuratDate {
  iso: string; // YYYY-MM-DD
  nakshatra?: string;
  tithi?: string;
}

interface AbujhDay {
  iso: string;
  name: string;
  note: string;
}

const VIVAH_MUHURAT: Record<Year, MuhuratDate[]> = {
  2026: [
    // February
    { iso: "2026-02-08", nakshatra: "Swati", tithi: "Saptami" },
    { iso: "2026-02-09", nakshatra: "Anuradha", tithi: "Navami" },
    { iso: "2026-02-10", nakshatra: "Anuradha", tithi: "Navami" },
    { iso: "2026-02-11", nakshatra: "Mula", tithi: "Ekadashi" },
    { iso: "2026-02-12", nakshatra: "Mula", tithi: "Ekadashi" },
    { iso: "2026-02-13", nakshatra: "Uttara Ashadha", tithi: "Trayodashi" },
    { iso: "2026-02-14", nakshatra: "Uttara Ashadha", tithi: "Trayodashi" },
    { iso: "2026-02-19", nakshatra: "Uttara Bhadrapada", tithi: "Tritiya" },
    { iso: "2026-02-20", nakshatra: "Revati", tithi: "Chaturthi" },
    { iso: "2026-02-25", nakshatra: "Mrigashira", tithi: "Navami" },
    // March
    { iso: "2026-03-01", nakshatra: "Magha", tithi: "Chaturdashi" },
    { iso: "2026-03-02", nakshatra: "Magha", tithi: "Purnima" },
    { iso: "2026-03-03", nakshatra: "Uttara Phalguni", tithi: "Pratipada" },
    { iso: "2026-03-06", nakshatra: "Swati", tithi: "Chaturthi" },
    { iso: "2026-03-07", nakshatra: "Swati", tithi: "Panchami" },
    { iso: "2026-03-08", nakshatra: "Anuradha", tithi: "Shashthi" },
    { iso: "2026-03-09", nakshatra: "Anuradha", tithi: "Shashthi" },
    { iso: "2026-03-11", nakshatra: "Mula", tithi: "Navami" },
    { iso: "2026-03-13", nakshatra: "Uttara Ashadha", tithi: "Ekadashi" },
    // April
    { iso: "2026-04-14", nakshatra: "Uttara Bhadrapada", tithi: "Trayodashi" },
    { iso: "2026-04-15", nakshatra: "Uttara Bhadrapada", tithi: "Trayodashi" },
    { iso: "2026-04-19", nakshatra: "Rohini", tithi: "Tritiya" },
    { iso: "2026-04-20", nakshatra: "Mrigashira", tithi: "Panchami" },
    { iso: "2026-04-25", nakshatra: "Magha", tithi: "Dashami" },
    { iso: "2026-04-26", nakshatra: "Magha", tithi: "Ekadashi" },
    { iso: "2026-04-27", nakshatra: "Uttara Phalguni", tithi: "Dwadashi" },
    { iso: "2026-04-28", nakshatra: "Hasta", tithi: "Trayodashi" },
    { iso: "2026-04-29", nakshatra: "Hasta", tithi: "Chaturdashi" },
    { iso: "2026-04-30", nakshatra: "Swati", tithi: "Purnima" },
    // May
    { iso: "2026-05-01", nakshatra: "Swati", tithi: "Purnima" },
    { iso: "2026-05-02", nakshatra: "Anuradha", tithi: "Dwitiya" },
    { iso: "2026-05-03", nakshatra: "Anuradha", tithi: "Dwitiya" },
    { iso: "2026-05-05", nakshatra: "Mula", tithi: "Chaturthi" },
    { iso: "2026-05-07", nakshatra: "Uttara Ashadha", tithi: "Shashthi" },
    { iso: "2026-05-13", nakshatra: "Uttara Bhadrapada / Revati", tithi: "Dwadashi" },
    // June
    { iso: "2026-06-20", nakshatra: "Uttara Phalguni", tithi: "Saptami" },
    { iso: "2026-06-21", nakshatra: "Hasta", tithi: "Ashtami" },
    { iso: "2026-06-22", nakshatra: "Hasta", tithi: "Navami" },
    { iso: "2026-06-23", nakshatra: "Swati", tithi: "Dashami" },
    { iso: "2026-06-24", nakshatra: "Swati", tithi: "Ekadashi" },
    { iso: "2026-06-26", nakshatra: "Anuradha", tithi: "Dwadashi" },
    { iso: "2026-06-27", nakshatra: "Anuradha", tithi: "Trayodashi" },
    { iso: "2026-06-28", nakshatra: "Mula", tithi: "Purnima" },
    { iso: "2026-06-29", nakshatra: "Mula", tithi: "Purnima" },
    { iso: "2026-06-30", nakshatra: "Uttara Ashadha", tithi: "Dwitiya" },
    // July
    { iso: "2026-07-06", nakshatra: "Uttara Bhadrapada", tithi: "Saptami" },
    // November
    { iso: "2026-11-20", nakshatra: "Revati", tithi: "Dwadashi" },
    { iso: "2026-11-21", nakshatra: "Revati", tithi: "Dwadashi" },
    { iso: "2026-11-24", nakshatra: "Rohini", tithi: "Dwitiya" },
    { iso: "2026-11-25", nakshatra: "Mrigashira", tithi: "Tritiya" },
    // December
    { iso: "2026-12-01", nakshatra: "Uttara Phalguni", tithi: "Navami" },
    { iso: "2026-12-02", nakshatra: "Hasta", tithi: "Dashami" },
    { iso: "2026-12-03", nakshatra: "Hasta", tithi: "Ekadashi" },
    { iso: "2026-12-04", nakshatra: "Swati", tithi: "Dwadashi" },
    { iso: "2026-12-05", nakshatra: "Swati", tithi: "Trayodashi" },
    { iso: "2026-12-11", nakshatra: "Uttara Ashadha", tithi: "Tritiya" },
    { iso: "2026-12-12", nakshatra: "Uttara Ashadha", tithi: "Chaturthi" },
  ],
  2027: [
    // January
    { iso: "2027-01-18", nakshatra: "Rohini", tithi: "Ekadashi" },
    { iso: "2027-01-19", nakshatra: "Mrigashira", tithi: "Dwadashi" },
    { iso: "2027-01-23", nakshatra: "Magha", tithi: "Tritiya" },
    { iso: "2027-01-24", nakshatra: "Magha", tithi: "Tritiya" },
    { iso: "2027-01-25", nakshatra: "Uttara Phalguni", tithi: "Panchami" },
    { iso: "2027-01-26", nakshatra: "Hasta", tithi: "Shashthi" },
    { iso: "2027-01-27", nakshatra: "Hasta", tithi: "Shashthi" },
    { iso: "2027-01-30", nakshatra: "Anuradha", tithi: "Navami" },
    // February
    { iso: "2027-02-01", nakshatra: "Mula", tithi: "Dwadashi" },
    { iso: "2027-02-02", nakshatra: "Mula", tithi: "Dwadashi" },
    { iso: "2027-02-09", nakshatra: "Uttara Bhadrapada", tithi: "Chaturthi" },
    { iso: "2027-02-10", nakshatra: "Uttara Bhadrapada / Revati", tithi: "Panchami" },
    { iso: "2027-02-11", nakshatra: "Revati", tithi: "Panchami" },
    { iso: "2027-02-14", nakshatra: "Rohini", tithi: "Navami" },
    { iso: "2027-02-20", nakshatra: "Magha", tithi: "Pratipada" },
    { iso: "2027-02-21", nakshatra: "Uttara Phalguni", tithi: "Dwitiya" },
    { iso: "2027-02-22", nakshatra: "Uttara Phalguni", tithi: "Tritiya" },
    { iso: "2027-02-24", nakshatra: "Swati", tithi: "Panchami" },
    { iso: "2027-02-25", nakshatra: "Swati", tithi: "Shashthi" },
    { iso: "2027-02-27", nakshatra: "Anuradha", tithi: "Ashtami" },
    // March
    { iso: "2027-03-01", nakshatra: "Mula", tithi: "Navami" },
    { iso: "2027-03-03", nakshatra: "Uttara Ashadha", tithi: "Ekadashi" },
    { iso: "2027-03-04", nakshatra: "Uttara Ashadha", tithi: "Dwadashi" },
    { iso: "2027-03-08", nakshatra: "Uttara Bhadrapada", tithi: "Pratipada" },
    { iso: "2027-03-09", nakshatra: "Uttara Bhadrapada / Revati", tithi: "Dwitiya" },
    { iso: "2027-03-10", nakshatra: "Revati", tithi: "Tritiya" },
    { iso: "2027-03-13", nakshatra: "Rohini", tithi: "Saptami" },
    // April
    { iso: "2027-04-17", nakshatra: "Uttara Phalguni", tithi: "Dwadashi" },
    { iso: "2027-04-18", nakshatra: "Uttara Phalguni", tithi: "Trayodashi" },
    { iso: "2027-04-19", nakshatra: "Hasta", tithi: "Chaturdashi" },
    { iso: "2027-04-20", nakshatra: "Swati", tithi: "Pratipada" },
    { iso: "2027-04-21", nakshatra: "Swati", tithi: "Dwitiya" },
    { iso: "2027-04-22", nakshatra: "Anuradha", tithi: "Tritiya" },
    { iso: "2027-04-23", nakshatra: "Anuradha", tithi: "Chaturthi" },
    { iso: "2027-04-24", nakshatra: "Mula", tithi: "Panchami" },
    { iso: "2027-04-25", nakshatra: "Mula", tithi: "Shashthi" },
    { iso: "2027-04-27", nakshatra: "Uttara Ashadha", tithi: "Saptami" },
    // May
    { iso: "2027-05-03", nakshatra: "Revati", tithi: "Trayodashi" },
    { iso: "2027-05-04", nakshatra: "Revati", tithi: "Chaturdashi" },
    { iso: "2027-05-07", nakshatra: "Rohini", tithi: "Dwitiya" },
    { iso: "2027-05-08", nakshatra: "Mrigashira", tithi: "Tritiya" },
    { iso: "2027-05-09", nakshatra: "Mrigashira", tithi: "Chaturthi" },
    { iso: "2027-05-13", nakshatra: "Magha", tithi: "Ashtami" },
    { iso: "2027-05-14", nakshatra: "Uttara Phalguni", tithi: "Dashami" },
    { iso: "2027-05-15", nakshatra: "Uttara Phalguni", tithi: "Ekadashi" },
    { iso: "2027-05-16", nakshatra: "Hasta", tithi: "Dwadashi" },
    { iso: "2027-05-18", nakshatra: "Swati", tithi: "Chaturdashi" },
    { iso: "2027-05-20", nakshatra: "Anuradha", tithi: "Pratipada" },
    { iso: "2027-05-22", nakshatra: "Mula", tithi: "Tritiya" },
    { iso: "2027-05-24", nakshatra: "Uttara Ashadha", tithi: "Panchami" },
    { iso: "2027-05-25", nakshatra: "Uttara Ashadha", tithi: "Panchami" },
    { iso: "2027-05-29", nakshatra: "Uttara Bhadrapada", tithi: "Dashami" },
    { iso: "2027-05-30", nakshatra: "Uttara Bhadrapada", tithi: "Ekadashi" },
    { iso: "2027-05-31", nakshatra: "Revati", tithi: "Ekadashi" },
    // June
    { iso: "2027-06-04", nakshatra: "Mrigashira", tithi: "Pratipada" },
    { iso: "2027-06-09", nakshatra: "Magha", tithi: "Shashthi" },
    { iso: "2027-06-11", nakshatra: "Uttara Phalguni", tithi: "Ashtami" },
    { iso: "2027-06-12", nakshatra: "Hasta", tithi: "Dashami" },
    { iso: "2027-06-14", nakshatra: "Swati", tithi: "Dwadashi" },
    { iso: "2027-06-15", nakshatra: "Swati / Vishakha", tithi: "Dwadashi" },
    { iso: "2027-06-16", nakshatra: "Anuradha", tithi: "Trayodashi" },
    { iso: "2027-06-17", nakshatra: "Anuradha", tithi: "Chaturdashi" },
    { iso: "2027-06-18", nakshatra: "Mula", tithi: "Pratipada" },
    { iso: "2027-06-19", nakshatra: "Mula", tithi: "Pratipada" },
    { iso: "2027-06-20", nakshatra: "Uttara Ashadha", tithi: "Dwitiya" },
    { iso: "2027-06-21", nakshatra: "Uttara Ashadha", tithi: "Tritiya" },
    { iso: "2027-06-26", nakshatra: "Uttara Bhadrapada", tithi: "Saptami" },
    { iso: "2027-06-27", nakshatra: "Uttara Bhadrapada / Revati", tithi: "Ashtami" },
    // July
    { iso: "2027-07-07", nakshatra: "Magha", tithi: "Panchami" },
    { iso: "2027-07-08", nakshatra: "Uttara Phalguni", tithi: "Shashthi" },
    { iso: "2027-07-11", nakshatra: "Swati", tithi: "Navami" },
    // November
    { iso: "2027-11-09", nakshatra: "Uttara Bhadrapada", tithi: "Dwadashi" },
    { iso: "2027-11-10", nakshatra: "Uttara Bhadrapada", tithi: "Dwadashi" },
    { iso: "2027-11-11", nakshatra: "Revati", tithi: "Trayodashi" },
    { iso: "2027-11-14", nakshatra: "Rohini", tithi: "Dwitiya" },
    { iso: "2027-11-15", nakshatra: "Rohini / Mrigashira", tithi: "Tritiya" },
    { iso: "2027-11-16", nakshatra: "Mrigashira", tithi: "Chaturthi" },
    { iso: "2027-11-20", nakshatra: "Magha", tithi: "Ashtami" },
    { iso: "2027-11-22", nakshatra: "Uttara Phalguni", tithi: "Ekadashi" },
    { iso: "2027-11-23", nakshatra: "Hasta", tithi: "Dwadashi" },
    { iso: "2027-11-24", nakshatra: "Swati", tithi: "Trayodashi" },
    { iso: "2027-11-25", nakshatra: "Swati", tithi: "Trayodashi" },
    { iso: "2027-11-29", nakshatra: "Mula", tithi: "Dwitiya" },
    // December
    { iso: "2027-12-01", nakshatra: "Uttara Ashadha", tithi: "Panchami" },
    { iso: "2027-12-02", nakshatra: "Uttara Ashadha", tithi: "Panchami" },
    { iso: "2027-12-06", nakshatra: "Uttara Bhadrapada", tithi: "Navami" },
    { iso: "2027-12-07", nakshatra: "Uttara Bhadrapada", tithi: "Dashami" },
    { iso: "2027-12-08", nakshatra: "Revati", tithi: "Ekadashi" },
    { iso: "2027-12-11", nakshatra: "Rohini", tithi: "Chaturdashi" },
    { iso: "2027-12-12", nakshatra: "Rohini", tithi: "Purnima" },
    { iso: "2027-12-13", nakshatra: "Mrigashira", tithi: "Pratipada" },
  ],
};

// Abujh muhurat — self-certified auspicious days, no panchang check needed
const ABUJH_MUHURAT: Record<Year, AbujhDay[]> = {
  2026: [
    { iso: "2026-01-23", name: "Basant Panchami", note: "Saraswati Puja day — abujh muhurat" },
    { iso: "2026-04-20", name: "Akshaya Tritiya", note: "Akha Teej — every moment is auspicious" },
    { iso: "2026-11-20", name: "Dev Uthani Ekadashi", note: "Devotthan — wedding season begins" },
  ],
  2027: [
    { iso: "2027-02-11", name: "Basant Panchami", note: "Saraswati Puja day — abujh muhurat" },
    { iso: "2027-05-09", name: "Akshaya Tritiya", note: "Akha Teej — every moment is auspicious" },
    { iso: "2027-11-09", name: "Dev Uthani Ekadashi", note: "Devotthan — wedding season begins" },
  ],
};

// Why certain months have no vivah muhurat
const NO_MUHURAT_NOTES: Record<string, string> = {
  "2026-1": "Shukra Asta (Venus combust) — no vivah muhurat this month.",
  "2026-8": "Chaturmas — no vivah muhurat until Dev Uthani Ekadashi.",
  "2026-9": "Chaturmas & Pitru Paksha — no vivah muhurat.",
  "2026-10": "Chaturmas — season resumes after Dev Uthani Ekadashi (20 Nov).",
  "2027-8": "Shukra Asta & Chaturmas — no vivah muhurat this month.",
  "2027-9": "Chaturmas & Pitru Paksha — no vivah muhurat.",
  "2027-10": "Chaturmas — season resumes after Dev Uthani Ekadashi (9 Nov).",
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ---------------------------------------------------------------------------
// Helpers (timezone-safe local date handling)
// ---------------------------------------------------------------------------

function parseLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function weekdayOf(iso: string): string {
  return parseLocal(iso).toLocaleDateString("en-IN", { weekday: "long" });
}

function daysAway(iso: string, today: Date): number {
  return Math.round((parseLocal(iso).getTime() - today.getTime()) / 86400000);
}

function daysAwayLabel(diff: number): string {
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return `${diff} days away`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MuhuratPage() {
  const [year, setYear] = useState<Year>(2026);
  const [today, setToday] = useState<Date | null>(null);

  // Set "today" on the client only, to avoid SSR/client hydration mismatch
  useEffect(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    setToday(now);
    if (now.getFullYear() >= 2027) setYear(2027);
  }, []);

  const dates = VIVAH_MUHURAT[year];
  const abujh = ABUJH_MUHURAT[year];

  const byMonth = useMemo(() => {
    const map = new Map<number, MuhuratDate[]>();
    for (const d of dates) {
      const month = parseLocal(d.iso).getMonth();
      const list = map.get(month) ?? [];
      list.push(d);
      map.set(month, list);
    }
    return map;
  }, [dates]);

  const upcomingCount = today ? dates.filter((d) => daysAway(d.iso, today) >= 0).length : dates.length;
  const nextMuhurat = today ? dates.find((d) => daysAway(d.iso, today) >= 0) : undefined;

  return (
    <div className="px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Muhurat Calendar</h1>
          <p className="text-sm text-navy-500">Shubh Vivah Muhurat · {year}</p>
        </div>
        {/* Year toggle */}
        <div className="flex rounded-lg bg-navy-100 p-1">
          {([2026, 2027] as Year[]).map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
                year === y ? "bg-white text-navy-900 shadow-sm" : "text-navy-500 hover:text-navy-700"
              )}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Quick stats */}
      <div className="mb-4 flex gap-2">
        <div className="flex-1 rounded-lg bg-rose-50 p-3 text-center">
          <p className="text-lg font-bold text-rose-600">{dates.length}</p>
          <p className="text-[10px] font-medium text-rose-500">Vivah Dates</p>
        </div>
        <div className="flex-1 rounded-lg bg-amber-50 p-3 text-center">
          <p className="text-lg font-bold text-amber-600">{abujh.length}</p>
          <p className="text-[10px] font-medium text-amber-500">Abujh Days</p>
        </div>
        <div className="flex-1 rounded-lg bg-emerald-50 p-3 text-center">
          <p className="text-lg font-bold text-emerald-600">{upcomingCount}</p>
          <p className="text-[10px] font-medium text-emerald-500">Upcoming</p>
        </div>
      </div>

      {/* Next muhurat highlight */}
      {today && nextMuhurat && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-emerald-600">Next vivah muhurat</p>
            <p className="text-sm font-bold text-emerald-800">
              {weekdayOf(nextMuhurat.iso)},{" "}
              {parseLocal(nextMuhurat.iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          </div>
          <Badge variant="success">{daysAwayLabel(daysAway(nextMuhurat.iso, today))}</Badge>
        </div>
      )}

      {/* Abujh muhurat */}
      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-navy-900">
          <Sparkles className="h-4 w-4 text-amber-500" /> Abujh Muhurat {year}
        </h2>
        <p className="mb-3 text-xs text-navy-400">
          Self-certified auspicious days — no panchang check needed for weddings.
        </p>
        <div className="space-y-2">
          {abujh.map((day) => {
            const diff = today ? daysAway(day.iso, today) : null;
            const isPast = diff !== null && diff < 0;
            return (
              <div
                key={day.iso}
                className={cn(
                  "flex items-center gap-3 rounded-lg bg-amber-50 p-3",
                  isPast && "opacity-50"
                )}
              >
                <div className="flex h-9 w-9 flex-shrink-0 flex-col items-center justify-center rounded-lg bg-white text-amber-600 shadow-sm">
                  <span className="text-sm font-bold leading-none">{parseLocal(day.iso).getDate()}</span>
                  <span className="text-[9px] font-medium uppercase leading-tight">
                    {parseLocal(day.iso).toLocaleDateString("en-IN", { month: "short" })}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy-900">{day.name}</p>
                  <p className="truncate text-xs text-navy-500">
                    {weekdayOf(day.iso)} · {day.note}
                  </p>
                </div>
                {diff !== null && diff >= 0 && <Badge variant="warning">{daysAwayLabel(diff)}</Badge>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Month cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {MONTH_NAMES.map((monthName, monthIndex) => {
          const monthDates = byMonth.get(monthIndex);

          if (!monthDates || monthDates.length === 0) {
            const note =
              NO_MUHURAT_NOTES[`${year}-${monthIndex + 1}`] ||
              "No vivah muhurat this month as per panchang.";
            return (
              <div key={monthName} className="rounded-xl border border-dashed border-navy-200 bg-navy-50/50 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-navy-400">{monthName}</h3>
                  <Moon className="h-4 w-4 text-navy-300" />
                </div>
                <p className="mt-1 text-xs text-navy-400">{note}</p>
              </div>
            );
          }

          return (
            <div key={monthName} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-navy-900">{monthName}</h3>
                <Badge variant="secondary">
                  {monthDates.length} {monthDates.length === 1 ? "date" : "dates"}
                </Badge>
              </div>
              <p className="mb-2 text-xs text-navy-400">
                {monthDates.length} muhurat {monthDates.length === 1 ? "date" : "dates"} in {monthName}
              </p>
              <div className="space-y-1.5">
                {monthDates.map((d) => {
                  const diff = today ? daysAway(d.iso, today) : null;
                  const isPast = diff !== null && diff < 0;
                  const isNext = nextMuhurat?.iso === d.iso;
                  return (
                    <div
                      key={d.iso}
                      className={cn(
                        "flex items-center gap-3 rounded-lg p-2",
                        isNext ? "bg-emerald-50 ring-1 ring-emerald-200" : "bg-navy-50/60",
                        isPast && "opacity-40"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold",
                          isNext ? "bg-emerald-500 text-white" : "bg-white text-navy-700 shadow-sm"
                        )}
                      >
                        {parseLocal(d.iso).getDate()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-navy-900">{weekdayOf(d.iso)}</p>
                        {(d.nakshatra || d.tithi) && (
                          <p className="truncate text-[11px] text-navy-500">
                            {[d.nakshatra, d.tithi].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                      {diff !== null && diff >= 0 && (
                        <span
                          className={cn(
                            "whitespace-nowrap text-[10px] font-semibold",
                            diff === 0 ? "text-emerald-600" : "text-navy-400"
                          )}
                        >
                          {daysAwayLabel(diff)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <div className="mt-6 flex items-start gap-2 rounded-xl bg-navy-100/60 p-4">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-navy-400" />
        <p className="text-xs text-navy-500">
          Dates are indicative, based on the traditional panchang. Please verify with your
          panditji for exact muhurat timing.
        </p>
      </div>

    </div>
  );
}
