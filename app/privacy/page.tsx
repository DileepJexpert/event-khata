import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — EventKhata",
  description: "Privacy policy for EventKhata — Vendor Payment Tracker for Event Planners",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-3xl font-bold text-navy-900">Privacy Policy</h1>
        <p className="mb-8 text-sm text-navy-500">Last updated: June 19, 2025</p>

        <div className="space-y-6 text-sm leading-relaxed text-navy-700">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-navy-900">1. Introduction</h2>
            <p>
              EventKhata (&quot;we&quot;, &quot;our&quot;, or &quot;the App&quot;) is a vendor payment tracking
              and event management application designed for Indian event planners. We are committed to
              protecting your privacy and handling your data responsibly. This Privacy Policy explains
              what information we collect, how we use it, and your rights regarding your data.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-navy-900">2. Information We Collect</h2>
            <p className="mb-2">We collect the following types of information:</p>
            <ul className="ml-4 list-disc space-y-1">
              <li><strong>Account Information:</strong> Email address and password when you create an account.</li>
              <li><strong>Business Information:</strong> Agency name, owner name, phone number, city, and state provided during onboarding.</li>
              <li><strong>Event Data:</strong> Client names, phone numbers, event details, venues, budgets, and dates you enter while managing events.</li>
              <li><strong>Vendor Data:</strong> Vendor names, contact details, UPI IDs, bank details, and payment records you create.</li>
              <li><strong>Financial Data:</strong> Payment amounts, transaction types, payment modes, and invoice details you record in the app.</li>
              <li><strong>Guest Data:</strong> Guest names, phone numbers, RSVP responses, and meal preferences collected through event invitations.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-navy-900">3. How We Use Your Information</h2>
            <ul className="ml-4 list-disc space-y-1">
              <li>To provide and maintain the EventKhata service</li>
              <li>To authenticate your identity and secure your account</li>
              <li>To display your event, vendor, and payment data within the app</li>
              <li>To generate invoices, reports, and budget summaries</li>
              <li>To send password reset emails when requested</li>
              <li>To enable features you opt into (payment links, WhatsApp messaging, AI suggestions)</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-navy-900">4. Data Storage and Security</h2>
            <p>
              Your data is stored securely on Supabase (powered by PostgreSQL) with Row Level Security (RLS)
              enabled. This ensures that your data is completely isolated from other users — no other
              event planner can access your events, vendors, or financial records. All data transmission
              is encrypted using HTTPS/TLS.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-navy-900">5. Data Sharing</h2>
            <p className="mb-2">We do not sell your data. We share information only in these limited cases:</p>
            <ul className="ml-4 list-disc space-y-1">
              <li><strong>Client Portal:</strong> When you generate a shareable link, limited event and payment data is visible to anyone with the link.</li>
              <li><strong>Public Invitations:</strong> When you create an e-invite, event details (title, date, venue) are visible to invited guests.</li>
              <li><strong>Third-Party Services (optional):</strong> If you enable Razorpay payment links, WhatsApp messaging, or AI suggestions, relevant data is shared with those services as needed to provide the feature.</li>
              <li><strong>Legal Requirements:</strong> We may disclose data if required by law or to protect our legal rights.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-navy-900">6. Your Rights</h2>
            <ul className="ml-4 list-disc space-y-1">
              <li><strong>Access:</strong> You can view all your data within the app at any time.</li>
              <li><strong>Correction:</strong> You can edit or update any information through the app.</li>
              <li><strong>Deletion:</strong> You can delete individual events, vendors, or records. To delete your entire account and all associated data, contact us at the email below.</li>
              <li><strong>Export:</strong> You can generate PDF reports and invoices for your records.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-navy-900">7. Cookies and Local Storage</h2>
            <p>
              We use browser local storage to save your authentication session and theme preference.
              We do not use third-party tracking cookies or analytics services.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-navy-900">8. Children&apos;s Privacy</h2>
            <p>
              EventKhata is a business application and is not intended for use by children under 18.
              We do not knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-navy-900">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Changes will be posted on this page
              with an updated &quot;Last updated&quot; date. Continued use of the app after changes
              constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-navy-900">10. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or your data, please contact us at:
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
