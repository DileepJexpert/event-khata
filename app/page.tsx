"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  IndianRupee,
  CalendarDays,
  Users,
  FileText,
  BarChart3,
  Share2,
  CheckCircle2,
  ArrowRight,
  Star,
  Shield,
  Smartphone,
} from "lucide-react";

const features = [
  {
    icon: IndianRupee,
    title: "Track Every Payment",
    desc: "Record advance, partial & final payments to every vendor. Never lose track of who got paid what.",
    color: "bg-emerald-500/10 text-emerald-400",
  },
  {
    icon: CalendarDays,
    title: "Multi-Day Event Planning",
    desc: "Manage weddings, mehendi, sangeet — all sub-events under one roof with separate budgets.",
    color: "bg-blue-500/10 text-blue-400",
  },
  {
    icon: Users,
    title: "Vendor Directory",
    desc: "Build your own vendor database. Compare vendors side-by-side. Rate & review after every event.",
    color: "bg-purple-500/10 text-purple-400",
  },
  {
    icon: FileText,
    title: "Instant Invoices",
    desc: "Generate professional invoices for clients in one tap. Share as PDF or WhatsApp link.",
    color: "bg-orange-500/10 text-orange-400",
  },
  {
    icon: BarChart3,
    title: "Budget Reports",
    desc: "See category-wise spending, vendor-wise breakdown, and real-time budget utilization.",
    color: "bg-cyan-500/10 text-cyan-400",
  },
  {
    icon: Share2,
    title: "Client Portal",
    desc: "Share a live budget link with clients. They see spending in real-time — total transparency.",
    color: "bg-pink-500/10 text-pink-400",
  },
];

const benefits = [
  "No more messy WhatsApp screenshots of payments",
  "Replace your paper bahi khata with digital records",
  "Know instantly how much budget is left",
  "All your vendor contacts in one place",
  "Share professional reports with clients",
  "Works offline — sync when you're back online",
];

export default function Home() {
  const router = useRouter();
  const supabase = createClient();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.replace("/events");
      } else {
        setChecking(false);
      }
    }
    check();
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-900">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900 text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 pb-16 pt-12">
        {/* Subtle gradient blob */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -left-20 top-40 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-lg text-center">
          {/* Logo */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/25">
            <IndianRupee className="h-10 w-10 text-white" />
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight">
            Event<span className="text-emerald-400">Khata</span>
          </h1>
          <p className="mt-3 text-lg text-navy-300">
            Your digital <span className="font-semibold text-white">bahi khata</span> for event planning
          </p>
          <p className="mt-2 text-sm text-navy-400">
            Track vendor payments, manage budgets, share reports — all from your phone
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              onClick={() => router.push("/login")}
              className="bg-emerald-500 text-base font-semibold text-white hover:bg-emerald-600"
            >
              Start Free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-navy-400">
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3" /> Free forever
            </span>
            <span className="flex items-center gap-1">
              <Smartphone className="h-3 w-3" /> Works on any phone
            </span>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="border-y border-navy-700/50 bg-navy-800/30 px-4 py-6">
        <div className="mx-auto max-w-lg text-center">
          <p className="text-sm text-navy-300">
            Built for <span className="font-semibold text-white">Indian event planners</span> who manage
            {" "}lakhs in vendor payments
          </p>
          <div className="mt-3 flex items-center justify-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            ))}
            <span className="ml-2 text-xs text-navy-400">Trusted by event agencies</span>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-lg">
          <h2 className="mb-2 text-center text-2xl font-bold">
            Everything you need to manage events
          </h2>
          <p className="mb-8 text-center text-sm text-navy-400">
            Stop juggling spreadsheets, WhatsApp & notebooks
          </p>

          <div className="grid grid-cols-1 gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-navy-700/50 bg-navy-800/40 p-4 transition-colors hover:border-navy-600"
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${f.color}`}>
                    <f.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{f.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-navy-400">{f.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why EventKhata */}
      <section className="border-t border-navy-700/50 bg-navy-800/20 px-4 py-12">
        <div className="mx-auto max-w-lg">
          <h2 className="mb-6 text-center text-2xl font-bold">
            Why event planners love it
          </h2>
          <div className="space-y-3">
            {benefits.map((b) => (
              <div key={b} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" />
                <p className="text-sm text-navy-300">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-lg">
          <h2 className="mb-8 text-center text-2xl font-bold">
            Get started in 30 seconds
          </h2>
          <div className="space-y-6">
            {[
              { step: "1", title: "Login with your phone", desc: "Quick OTP verification — no passwords needed" },
              { step: "2", title: "Create your agency", desc: "Set up your event planning business profile" },
              { step: "3", title: "Add your first event", desc: "Enter client details, budget, and start adding vendors" },
              { step: "4", title: "Track payments", desc: "Record every advance, partial & final payment as it happens" },
            ].map((s) => (
              <div key={s.step} className="flex gap-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold">
                  {s.step}
                </div>
                <div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="mt-0.5 text-sm text-navy-400">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-navy-700/50 px-4 py-12">
        <div className="mx-auto max-w-lg text-center">
          <h2 className="text-2xl font-bold">
            Ready to ditch the paper khata?
          </h2>
          <p className="mt-2 text-sm text-navy-400">
            Join hundreds of event planners managing crores in vendor payments digitally
          </p>
          <Button
            size="lg"
            onClick={() => router.push("/login")}
            className="mt-6 bg-emerald-500 text-base font-semibold text-white hover:bg-emerald-600"
          >
            Create Free Account <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <p className="mt-3 text-xs text-navy-500">
            No credit card required. No hidden charges. Ever.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-navy-700/50 px-4 py-6 text-center text-xs text-navy-500">
        <p>EventKhata — Digital bahi khata for event planners</p>
      </footer>
    </div>
  );
}
