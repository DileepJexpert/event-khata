import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — EventKhata",
  description: "Terms of Service for EventKhata — Vendor Payment Tracker for Event Planners",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-3xl font-bold text-navy-900">Terms of Service</h1>
        <p className="mb-8 text-sm text-navy-500">Last updated: June 19, 2025</p>

        <div className="space-y-6 text-sm leading-relaxed text-navy-700">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-navy-900">1. Acceptance of Terms</h2>
            <p>
              By creating an account or using EventKhata (&quot;the App&quot;), you agree to these Terms of
              Service. If you do not agree, please do not use the App.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-navy-900">2. Description of Service</h2>
            <p>
              EventKhata is a vendor payment tracking and event management platform designed for Indian
              event planners. The App helps you manage events, track vendor payments, generate invoices,
              and share reports with clients.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-navy-900">3. Account Responsibilities</h2>
            <ul className="ml-4 list-disc space-y-1">
              <li>You must provide accurate information when creating an account.</li>
              <li>You are responsible for maintaining the security of your password.</li>
              <li>You are responsible for all activity that occurs under your account.</li>
              <li>You must notify us immediately if you suspect unauthorized access to your account.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-navy-900">4. Acceptable Use</h2>
            <p className="mb-2">You agree not to:</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>Use the App for any illegal purpose</li>
              <li>Attempt to access other users&apos; data</li>
              <li>Upload malicious content or attempt to compromise the system</li>
              <li>Resell or redistribute the App without permission</li>
              <li>Use automated tools to scrape or extract data from the App</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-navy-900">5. Data Ownership</h2>
            <p>
              You own all data you enter into EventKhata. We do not claim ownership of your business
              data, client information, vendor details, or financial records. You can export or delete
              your data at any time.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-navy-900">6. Service Availability</h2>
            <p>
              We strive to keep EventKhata available at all times, but we do not guarantee uninterrupted
              service. We may perform maintenance or updates that temporarily affect availability. We are
              not liable for any losses resulting from service downtime.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-navy-900">7. Financial Disclaimer</h2>
            <p>
              EventKhata is a record-keeping tool. It does not process payments directly (unless you
              enable optional third-party integrations like Razorpay). We are not responsible for the
              accuracy of financial data you enter, nor for any financial disputes between you and your
              vendors or clients.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-navy-900">8. Account Suspension</h2>
            <p>
              We reserve the right to suspend or terminate your account if you violate these terms,
              engage in fraudulent activity, or use the App in a way that harms other users or the
              service.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-navy-900">9. Limitation of Liability</h2>
            <p>
              EventKhata is provided &quot;as is&quot; without warranties of any kind. To the maximum
              extent permitted by law, we are not liable for any indirect, incidental, or consequential
              damages arising from your use of the App.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-navy-900">10. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of the App after changes
              constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-navy-900">11. Contact</h2>
            <p>
              For questions about these Terms, contact us at:
            </p>
            <p className="mt-2 font-medium text-navy-900">
              Email: todileepmaurya@gmail.com
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-navy-200 pt-6 text-center">
          <p className="text-xs text-navy-400">EventKhata — Digital bahi khata for event planners</p>
        </div>
      </div>
    </div>
  );
}
